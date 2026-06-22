import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  generatedMessages,
  keywordFilters,
  projects,
  teamMembers,
  teamSettings,
  teams,
} from "@/server/db/schema";
import {
  generateReplyMessage,
  generateWarmupMessage,
  type ResponseLanguage,
} from "@/server/ai/message-generation";
import { fetchSubredditPosts } from "@/server/reddit/client";
import { scrapeTeamDiscovery } from "@/server/reddit/scraper";

const DEFAULT_MAX_REPLIES = Number(process.env.SCRAPE_MAX_REPLIES_PER_RUN ?? 5);
const DEFAULT_MAX_WARMUP = Number(process.env.SCRAPE_MAX_WARMUP_PER_RUN ?? 3);

async function getLanguage(db: Database, teamId: string): Promise<ResponseLanguage> {
  const settings = await db.query.teamSettings.findFirst({
    where: eq(teamSettings.teamId, teamId),
  });
  return (settings?.responseLanguage ?? "fr") as ResponseLanguage;
}

async function getTeamOwnerId(db: Database, teamId: string): Promise<string | null> {
  const owner = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "owner")),
  });
  return owner?.userId ?? null;
}

async function touchTeamSync(db: Database, teamId: string) {
  await db
    .insert(teamSettings)
    .values({ teamId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: teamSettings.teamId,
      set: { updatedAt: new Date() },
    });
}

export async function syncTeamReplies(
  db: Database,
  teamId: string,
  options?: { maxNew?: number; userId?: string | null },
) {
  const maxNew = options?.maxNew ?? DEFAULT_MAX_REPLIES;
  await scrapeTeamDiscovery(db, teamId);

  const [project, language, existing, discovered] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.teamId, teamId) }),
    getLanguage(db, teamId),
    db.query.generatedMessages.findMany({
      where: and(
        eq(generatedMessages.teamId, teamId),
        eq(generatedMessages.type, "reply"),
      ),
    }),
    db.query.discoveredPosts.findMany({
      where: and(
        eq(discoveredPosts.teamId, teamId),
        eq(discoveredPosts.isArchived, false),
      ),
      orderBy: [desc(discoveredPosts.intentScore), desc(discoveredPosts.score)],
      limit: 30,
    }),
  ]);

  const existingIds = new Set(existing.map((m) => m.redditId));
  const actorId = options?.userId ?? (await getTeamOwnerId(db, teamId));
  let created = 0;

  const productContext =
    project?.description ||
    project?.name ||
    "outil SaaS pour automatiser le marketing";

  for (const post of discovered) {
    if (created >= maxNew) break;
    if (existingIds.has(post.redditId)) continue;

    const mentionSite = Math.random() < 0.5;
    try {
      const generated = await generateReplyMessage({
        postTitle: post.title,
        postBody: post.body ?? undefined,
        subreddit: post.subreddit,
        productContext,
        siteUrl: project?.siteUrl,
        mentionSite,
        language,
      });

      await db.insert(generatedMessages).values({
        teamId,
        type: "reply",
        redditId: post.redditId,
        subreddit: post.subreddit,
        title: post.title,
        author: post.author,
        permalink:
          post.permalink ??
          `https://reddit.com/r/${post.subreddit}/comments/${post.redditId}`,
        postBody: post.body,
        generatedBody: generated.body,
        relevanceScore: post.intentScore,
        safetyScore: generated.safetyScore,
        generatedByUserId: actorId,
        redditCreatedAt: post.discoveredAt,
      });
      existingIds.add(post.redditId);
      created++;
    } catch (error) {
      console.error(`[sync-team] reply ${post.redditId}:`, error);
      continue;
    }
  }

  return { created, scraped: discovered.length };
}

export async function syncTeamWarmup(
  db: Database,
  teamId: string,
  options?: { maxNew?: number; userId?: string | null },
) {
  const maxNew = options?.maxNew ?? DEFAULT_MAX_WARMUP;

  const [filter, language, existing] = await Promise.all([
    db.query.keywordFilters.findFirst({
      where: eq(keywordFilters.teamId, teamId),
    }),
    getLanguage(db, teamId),
    db.query.generatedMessages.findMany({
      where: and(
        eq(generatedMessages.teamId, teamId),
        eq(generatedMessages.type, "warmup"),
      ),
    }),
  ]);

  const subreddits = filter?.subreddits?.length
    ? filter.subreddits
    : ["SaaS", "startups", "marketing"];

  const existingIds = new Set(existing.map((m) => m.redditId));
  const actorId = options?.userId ?? (await getTeamOwnerId(db, teamId));
  let created = 0;

  for (const sub of subreddits.slice(0, 4)) {
    if (created >= maxNew) break;

    let posts;
    try {
      posts = await fetchSubredditPosts(sub, 10, "hot");
    } catch {
      continue;
    }

    for (const post of posts) {
      if (created >= maxNew) break;
      if (existingIds.has(post.id)) continue;

      try {
        const generated = await generateWarmupMessage({
          postTitle: post.title,
          postBody: post.selftext || undefined,
          subreddit: post.subreddit,
          language,
        });

        await db.insert(generatedMessages).values({
          teamId,
          type: "warmup",
          redditId: post.id,
          subreddit: post.subreddit,
          title: post.title,
          author: post.author,
          permalink: `https://reddit.com${post.permalink}`,
          postBody: post.selftext || null,
          generatedBody: generated.body,
          relevanceScore: String(Math.min(1, post.score / 1000)),
          safetyScore: generated.safetyScore,
          generatedByUserId: actorId,
          redditCreatedAt: null,
        });
        existingIds.add(post.id);
        created++;
      } catch (error) {
        console.error(`[sync-team] warmup ${post.id}:`, error);
        continue;
      }
    }
  }

  return { created };
}

export async function runFullTeamSync(
  db: Database,
  teamId: string,
  userId?: string | null,
) {
  let redditError: string | undefined;

  const [replies, warmup] = await Promise.all([
    syncTeamReplies(db, teamId, { userId }).catch((error) => {
      redditError =
        error instanceof Error ? error.message : "Erreur sync reply";
      return { created: 0, scraped: 0, error: redditError };
    }),
    syncTeamWarmup(db, teamId, { userId }).catch((error) => {
      const msg = error instanceof Error ? error.message : "Erreur sync warmup";
      redditError = redditError ?? msg;
      return { created: 0, error: msg };
    }),
  ]);

  if (!redditError && (replies.created > 0 || warmup.created > 0)) {
    await touchTeamSync(db, teamId);
  } else if (!redditError) {
    await touchTeamSync(db, teamId);
  }

  return { teamId, replies, warmup, redditError };
}

export async function runAllTeamsSync(db: Database) {
  const allTeams = await db.select({ id: teams.id }).from(teams);
  const results = [];

  for (const team of allTeams) {
    try {
      const result = await runFullTeamSync(db, team.id);
      results.push(result);
    } catch (error) {
      results.push({
        teamId: team.id,
        error: error instanceof Error ? error.message : "sync failed",
      });
    }
  }

  return results;
}
