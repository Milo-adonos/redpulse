import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  keywordFilters,
  projects,
  scrapedComments,
} from "@/server/db/schema";
import { scorePostRelevance } from "@/server/ai/relevance-scoring";
import { ensureSubredditVoicesForTeam } from "@/server/reddit/subreddit-voice";
import { buildRedditPostUrl } from "@/server/reddit/client";
import { redditDateFromUnix } from "@/server/reddit/freshness";
import {
  fetchSubredditJson,
  fetchPostCommentsJson,
  buildRedditPostUrlFromJson,
  type RedditJsonPost,
} from "@/server/reddit/reddit-json";
import {
  discoverSubredditsForProduct,
  expandKeywords,
} from "@/server/reddit/subreddit-discovery";

const POSTS_PER_SUBREDDIT = 25;
const COMMENTS_PER_POST = 10;

export function buildTeamKeywords(
  filterKeywords: string[] | undefined,
  project: {
    keywords?: string[] | null;
    description?: string | null;
    name?: string | null;
  } | null,
): string[] {
  return expandKeywords(
    [...(filterKeywords ?? []), ...(project?.keywords ?? [])],
    project?.name ?? "",
    project?.description ?? "",
  ).slice(0, 20);
}

function jsonToListingPost(post: RedditJsonPost) {
  return {
    id: post.id,
    subreddit: post.subreddit,
    title: post.title,
    selftext: post.selftext,
    author: post.author,
    score: post.score,
    num_comments: post.num_comments,
    url: post.url,
    permalink: buildRedditPostUrlFromJson(post),
    created_utc: post.created_utc,
    link_flair_text: post.link_flair_text,
  };
}

async function persistDiscoveredSubreddits(
  db: Database,
  teamId: string,
  subreddits: string[],
  keywords: string[],
) {
  const existing = await db.query.keywordFilters.findFirst({
    where: eq(keywordFilters.teamId, teamId),
  });

  if (existing) {
    await db
      .update(keywordFilters)
      .set({ subreddits, keywords, isActive: true })
      .where(eq(keywordFilters.id, existing.id));
    return;
  }

  await db.insert(keywordFilters).values({
    teamId,
    keywords,
    subreddits,
    isActive: true,
  });
}

export async function refreshTeamSubreddits(db: Database, teamId: string) {
  const [filter, project] = await Promise.all([
    db.query.keywordFilters.findFirst({
      where: eq(keywordFilters.teamId, teamId),
    }),
    db.query.projects.findFirst({
      where: eq(projects.teamId, teamId),
    }),
  ]);

  const keywords = buildTeamKeywords(filter?.keywords, project ?? null);
  const subreddits = await discoverSubredditsForProduct({
    keywords,
    productName: project?.name,
    description: project?.description,
    seedSubreddits: filter?.subreddits ?? [],
    limit: 10,
    fast: true,
  });

  await persistDiscoveredSubreddits(db, teamId, subreddits, keywords);
  return subreddits;
}

export async function getTeamTargeting(db: Database, teamId: string) {
  const [filter, project] = await Promise.all([
    db.query.keywordFilters.findFirst({
      where: and(
        eq(keywordFilters.teamId, teamId),
        eq(keywordFilters.isActive, true),
      ),
    }),
    db.query.projects.findFirst({
      where: eq(projects.teamId, teamId),
    }),
  ]);

  const keywords = buildTeamKeywords(filter?.keywords, project ?? null);
  const subreddits = (filter?.subreddits ?? [])
    .map((s) => s.replace(/^r\//i, ""))
    .slice(0, 10);

  return { subreddits, keywords };
}

type IngestPost = {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
  link_flair_text?: string | null;
};

async function storeComments(
  db: Database,
  teamId: string,
  discoveredPostId: string,
  subreddit: string,
  postId: string,
) {
  const comments = await fetchPostCommentsJson(
    subreddit,
    postId,
    COMMENTS_PER_POST,
  );
  for (const comment of comments) {
    try {
      await db
        .insert(scrapedComments)
        .values({
          teamId,
          discoveredPostId,
          redditId: comment.id,
          author: comment.author,
          body: comment.body,
          score: comment.score,
        })
        .onConflictDoNothing();
    } catch {
      // duplicate
    }
  }
}

/** Reddit fetch only — no Anthropic calls. */
export async function scrapeTeamDiscovery(db: Database, teamId: string) {
  const { subreddits } = await getTeamTargeting(db, teamId);

  if (!subreddits.length) {
    return { inserted: 0, subreddits: 0 };
  }

  const existingRows = await db.query.discoveredPosts.findMany({
    where: eq(discoveredPosts.teamId, teamId),
    columns: { redditId: true },
  });
  const existingIds = new Set(existingRows.map((r) => r.redditId));

  let inserted = 0;

  for (const sub of subreddits) {
    const jsonPosts = await fetchSubredditJson(sub, POSTS_PER_SUBREDDIT, "new", {
      skipAgeFilter: true,
    });
    const posts = jsonPosts.map(jsonToListingPost);

    for (const post of posts) {
      if (existingIds.has(post.id)) continue;

      try {
        const [row] = await db
          .insert(discoveredPosts)
          .values({
            teamId,
            redditId: post.id,
            subreddit: post.subreddit,
            title: post.title,
            body: post.selftext || null,
            author: post.author,
            score: post.score,
            numComments: post.num_comments,
            url: post.url,
            permalink: buildRedditPostUrl(
              post.subreddit,
              post.id,
              post.permalink,
              post.url,
            ),
            flair: post.link_flair_text ?? null,
            discoveredAt: redditDateFromUnix(post.created_utc),
          })
          .onConflictDoNothing()
          .returning({ id: discoveredPosts.id });

        if (row) {
          inserted++;
          existingIds.add(post.id);
          await storeComments(db, teamId, row.id, post.subreddit, post.id);
        }
      } catch {
        // duplicate or race
      }
    }
  }

  return { inserted, subreddits: subreddits.length };
}

/** Score posts that have not been scored yet — Claude haiku, max 50 tokens. */
export async function scoreUnscoredPosts(db: Database, teamId: string) {
  const project = await db.query.projects.findFirst({
    where: eq(projects.teamId, teamId),
  });

  const productPrompt =
    project?.productPrompt?.trim() ||
    project?.description?.trim() ||
    project?.name ||
    "";

  if (!productPrompt) return { scored: 0 };

  const unscored = await db.query.discoveredPosts.findMany({
    where: and(
      eq(discoveredPosts.teamId, teamId),
      isNull(discoveredPosts.relevanceScore),
    ),
    limit: 50,
  });

  let scored = 0;

  for (const post of unscored) {
    const relevance = await scorePostRelevance({
      productPrompt,
      title: post.title,
      body: post.body ?? "",
    });

    await db
      .update(discoveredPosts)
      .set({
        relevanceScore: relevance.score,
        relevanceSection: relevance.section,
        relevanceReason: relevance.reason,
        sectionScores: {
          reply: relevance.section === "reply" ? relevance.score : 0,
          warmup: relevance.section === "warmup" ? relevance.score : 0,
          influence: relevance.section === "influence" ? relevance.score : 0,
        },
      })
      .where(eq(discoveredPosts.id, post.id));

    scored++;
  }

  return { scored };
}

/** Scrape Reddit then score new posts — triggered manually only. */
export async function scrapeAndScoreTeam(db: Database, teamId: string) {
  const scrapeResult = await scrapeTeamDiscovery(db, teamId);
  const scoreResult = await scoreUnscoredPosts(db, teamId);
  const { subreddits } = await getTeamTargeting(db, teamId);
  const voiceResult = await ensureSubredditVoicesForTeam(db, teamId, subreddits);
  return { ...scrapeResult, ...scoreResult, voicesAnalyzed: voiceResult.analyzed };
}

export async function scrapeAllTeams(db: Database) {
  const { teams } = await import("@/server/db/schema");
  const allTeams = await db.select({ id: teams.id }).from(teams);
  const results = [];

  for (const team of allTeams) {
    const result = await scrapeAndScoreTeam(db, team.id);
    results.push({ teamId: team.id, ...result });
  }

  return results;
}
