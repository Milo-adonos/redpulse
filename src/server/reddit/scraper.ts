import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  keywordFilters,
  projects,
  teams,
} from "@/server/db/schema";
import {
  buildRedditPostUrl,
  estimateIntentScore,
  fetchSubredditPosts,
  isRelevantToIcp,
  matchKeywords,
} from "@/server/reddit/client";
import { redditDateFromUnix } from "@/server/reddit/freshness";
import {
  discoverSubredditsForProduct,
  expandKeywords,
} from "@/server/reddit/subreddit-discovery";

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

async function discoverForTeam(
  db: Database,
  teamId: string,
  limit = 10,
): Promise<string[]> {
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

  return discoverSubredditsForProduct({
    keywords,
    productName: project?.name,
    description: project?.description,
    seedSubreddits: filter?.subreddits ?? [],
    limit,
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

  const subreddits = filter?.subreddits?.length
    ? filter.subreddits.map((s) => s.replace(/^r\//i, ""))
    : await discoverForTeam(db, teamId, 10);

  if (!filter?.subreddits?.length) {
    await persistDiscoveredSubreddits(db, teamId, subreddits, keywords);
  }

  return { subreddits, keywords };
}

export async function scrapeTeamDiscovery(db: Database, teamId: string) {
  const { subreddits, keywords } = await getTeamTargeting(db, teamId);

  let inserted = 0;
  let lastError: Error | null = null;
  let fetchedAny = false;

  for (const sub of subreddits) {
    let posts;
    try {
      posts = await fetchSubredditPosts(sub, 20, "new");
      if (posts.length > 0) fetchedAny = true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[scraper] r/${sub}:`, error);
      continue;
    }

    for (const post of posts) {
      const combined = `${post.title} ${post.selftext ?? ""}`;
      if (
        !isRelevantToIcp(
          post.title,
          post.selftext ?? "",
          keywords,
          subreddits,
          post.subreddit,
        )
      ) {
        continue;
      }

      const matched = matchKeywords(combined, keywords);
      const intentScore = estimateIntentScore(
        post.title,
        post.selftext ?? "",
        matched,
      );

      try {
        await db
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
            matchedKeywords: matched,
            intentScore: String(intentScore),
            discoveredAt: redditDateFromUnix(post.created_utc),
          })
          .onConflictDoNothing();
        inserted++;
      } catch {
        // duplicate or race
      }
    }
  }

  if (!fetchedAny && lastError) {
    console.warn(`[scraper] team ${teamId}:`, lastError.message);
  }

  return { inserted, subreddits: subreddits.length };
}

export async function scrapeAllTeams(db: Database) {
  const allTeams = await db.select({ id: teams.id }).from(teams);
  const results = [];

  for (const team of allTeams) {
    const result = await scrapeTeamDiscovery(db, team.id);
    results.push({ teamId: team.id, ...result });
  }

  return results;
}
