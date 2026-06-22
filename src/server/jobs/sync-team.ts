import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  directMessages,
  generatedMessages,
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
import { generateRedditReply } from "@/server/ai/anthropic";
import {
  buildRedditPostUrl,
  fetchSubredditPosts,
  isInTargetSubreddit,
  isRelevantToIcp,
} from "@/server/reddit/client";
import {
  getMaxPostAgeDate,
  redditDateFromUnix,
} from "@/server/reddit/freshness";
import { getTeamTargeting, scrapeTeamDiscovery } from "@/server/reddit/scraper";

const DEFAULT_MAX_REPLIES = Number(process.env.SCRAPE_MAX_REPLIES_PER_RUN ?? 8);
const DEFAULT_MAX_WARMUP = Number(process.env.SCRAPE_MAX_WARMUP_PER_RUN ?? 5);
const DEFAULT_MAX_DMS = Number(process.env.SCRAPE_MAX_DMS_PER_RUN ?? 3);

function isLikelyFrench(text: string): boolean {
  return /\b(j'ai|j'|c'est|les |des |pour |avec |truc|plutôt|ça |une |dans |qui |mais |être|français)\b/i.test(
    text,
  );
}

function isMessageRecent(_redditCreatedAt: Date | null, createdAt: Date): boolean {
  return createdAt >= getMaxPostAgeDate();
}

function fallbackWarmupBody(subreddit: string, title: string): string {
  const t = title.toLowerCase();
  if (/nail|manicure|polish|gel/.test(t)) {
    return "these look really clean, love the shape on these";
  }
  if (/\?|help|advice|recommend/.test(t)) {
    return "following this thread, curious what others ended up going with";
  }
  return `solid post — always good to see real talk in r/${subreddit.replace(/^r\//i, "")}`;
}

function fallbackReplyBody(productName: string, mentionSite: boolean): string {
  if (mentionSite) {
    return `we had something similar at our salon — ended up using ${productName} to preview designs on clients before committing, saved a lot of back and forth`;
  }
  return "yeah previewing the design first helps a ton, especially when clients aren't sure what they want";
}

async function getLanguage(): Promise<ResponseLanguage> {
  return "en";
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
  try {
    await scrapeTeamDiscovery(db, teamId);
  } catch (error) {
    console.warn(`[sync-team] scrape ${teamId}:`, error);
  }

  const [project, language, existing, discovered, targeting] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.teamId, teamId) }),
    getLanguage(),
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
      orderBy: [desc(discoveredPosts.discoveredAt), desc(discoveredPosts.intentScore)],
      limit: 40,
    }),
    getTeamTargeting(db, teamId),
  ]);

  const { keywords, subreddits } = targeting;
  const relevantDiscovered = discovered.filter((post) =>
    isInTargetSubreddit(post.subreddit, subreddits) &&
    isRelevantToIcp(
      post.title,
      post.body ?? "",
      keywords,
      subreddits,
      post.subreddit,
    ),
  );

  const existingIds = new Set(existing.map((m) => m.redditId));
  const actorId = options?.userId ?? (await getTeamOwnerId(db, teamId));
  let created = 0;

  for (const msg of existing) {
    if (msg.isSent) continue;
    if (
      !isInTargetSubreddit(msg.subreddit, subreddits) ||
      !isRelevantToIcp(
        msg.title,
        msg.postBody ?? "",
        keywords,
        subreddits,
        msg.subreddit,
      ) ||
      !isMessageRecent(msg.redditCreatedAt, msg.createdAt) ||
      isLikelyFrench(msg.generatedBody)
    ) {
      await db.delete(generatedMessages).where(eq(generatedMessages.id, msg.id));
      existingIds.delete(msg.redditId);
    }
  }

  for (const post of relevantDiscovered) {
    if (created >= maxNew) break;
    if (existingIds.has(post.redditId)) continue;

    const mentionSite = created % 3 !== 2;
    let generatedBody: string;
    let safetyScore = 9;

    try {
      const generated = await generateReplyMessage({
        postTitle: post.title,
        postBody: post.body ?? undefined,
        subreddit: post.subreddit,
        productContext: project?.description || project?.name || "",
        productName: project?.name ?? undefined,
        siteUrl: project?.siteUrl ?? undefined,
        mentionSite,
        language,
      });
      generatedBody = generated.body;
      safetyScore = generated.safetyScore;
    } catch (error) {
      console.error(`[sync-team] reply AI ${post.redditId}:`, error);
      generatedBody = fallbackReplyBody(
        project?.name ?? "our tool",
        mentionSite,
      );
    }

    try {
      await db.insert(generatedMessages).values({
        teamId,
        type: "reply",
        redditId: post.redditId,
        subreddit: post.subreddit,
        title: post.title,
        author: post.author,
        permalink: buildRedditPostUrl(
          post.subreddit,
          post.redditId,
          post.permalink,
        ),
        postBody: post.body,
        generatedBody,
        relevanceScore: post.intentScore,
        safetyScore,
        generatedByUserId: actorId,
        redditCreatedAt: post.discoveredAt,
      });
      existingIds.add(post.redditId);
      created++;
    } catch (error) {
      console.error(`[sync-team] reply insert ${post.redditId}:`, error);
      continue;
    }
  }

  return { created, scraped: relevantDiscovered.length };
}

export async function syncTeamWarmup(
  db: Database,
  teamId: string,
  options?: { maxNew?: number; userId?: string | null },
) {
  const maxNew = options?.maxNew ?? DEFAULT_MAX_WARMUP;

  const [targeting, language, existing] = await Promise.all([
    getTeamTargeting(db, teamId),
    getLanguage(),
    db.query.generatedMessages.findMany({
      where: and(
        eq(generatedMessages.teamId, teamId),
        eq(generatedMessages.type, "warmup"),
      ),
    }),
  ]);

  const { keywords, subreddits } = targeting;

  const existingIds = new Set(existing.map((m) => m.redditId));
  const actorId = options?.userId ?? (await getTeamOwnerId(db, teamId));
  let created = 0;

  for (const msg of existing) {
    if (msg.isSent) continue;
    if (
      !isInTargetSubreddit(msg.subreddit, subreddits) ||
      !isRelevantToIcp(
        msg.title,
        msg.postBody ?? "",
        keywords,
        subreddits,
        msg.subreddit,
      ) ||
      !isMessageRecent(msg.redditCreatedAt, msg.createdAt)
    ) {
      await db.delete(generatedMessages).where(eq(generatedMessages.id, msg.id));
      existingIds.delete(msg.redditId);
    }
  }

  for (const sub of subreddits.slice(0, 6)) {
    if (created >= maxNew) break;

    let posts;
    try {
      posts = await fetchSubredditPosts(sub, 10, "new");
    } catch {
      continue;
    }

    for (const post of posts) {
      if (created >= maxNew) break;
      if (existingIds.has(post.id)) continue;
      if (!isInTargetSubreddit(post.subreddit, subreddits)) continue;
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

      try {
        let generatedBody: string;
        let safetyScore = 9;
        try {
          const generated = await generateWarmupMessage({
            postTitle: post.title,
            postBody: post.selftext || undefined,
            subreddit: post.subreddit,
            language,
          });
          generatedBody = generated.body;
          safetyScore = generated.safetyScore;
        } catch (error) {
          console.error(`[sync-team] warmup AI ${post.id}:`, error);
          generatedBody = fallbackWarmupBody(post.subreddit, post.title);
        }

        await db.insert(generatedMessages).values({
          teamId,
          type: "warmup",
          redditId: post.id,
          subreddit: post.subreddit,
          title: post.title,
          author: post.author,
          permalink: buildRedditPostUrl(
            post.subreddit,
            post.id,
            post.permalink,
            post.url,
          ),
          postBody: post.selftext || null,
          generatedBody,
          relevanceScore: String(Math.min(1, post.score / 1000)),
          safetyScore,
          generatedByUserId: actorId,
          redditCreatedAt: redditDateFromUnix(post.created_utc),
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

export async function syncTeamDms(
  db: Database,
  teamId: string,
  options?: { maxNew?: number; userId?: string | null },
) {
  const maxNew = options?.maxNew ?? DEFAULT_MAX_DMS;

  const [project, targeting, existing, discovered] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.teamId, teamId) }),
    getTeamTargeting(db, teamId),
    db.query.directMessages.findMany({
      where: eq(directMessages.teamId, teamId),
    }),
    db.query.discoveredPosts.findMany({
      where: and(
        eq(discoveredPosts.teamId, teamId),
        eq(discoveredPosts.isArchived, false),
      ),
      orderBy: [desc(discoveredPosts.intentScore), desc(discoveredPosts.discoveredAt)],
      limit: 20,
    }),
  ]);

  const { keywords, subreddits } = targeting;
  const existingPostIds = new Set(
    existing.map((dm) => dm.discoveredPostId).filter(Boolean),
  );
  const actorId = options?.userId ?? (await getTeamOwnerId(db, teamId));
  let created = 0;

  for (const post of discovered) {
    if (created >= maxNew) break;
    if (existingPostIds.has(post.id)) continue;
    if (!post.author || post.author === "unknown" || post.author === "[deleted]") {
      continue;
    }
    if (
      !isRelevantToIcp(
        post.title,
        post.body ?? "",
        keywords,
        subreddits,
        post.subreddit,
      )
    ) {
      continue;
    }

    try {
      let body: string;
      try {
        const result = await generateRedditReply({
          postTitle: post.title,
          postBody: post.body ?? undefined,
          subreddit: post.subreddit,
          productContext: project?.description ?? project?.name ?? "",
          productName: project?.name ?? undefined,
          mentionProduct: true,
          tone: "casual",
        });
        body = `Hey — saw your post in r/${post.subreddit}. ${result.body}`;
      } catch (error) {
        console.error(`[sync-team] dm AI ${post.redditId}:`, error);
        body = `Hey — saw your post in r/${post.subreddit}. ${fallbackReplyBody(project?.name ?? "MakeMyNails", true)}`;
      }

      const recipient = post.author.replace(/^u\//i, "");
      const subject = `Re: ${post.title.slice(0, 80)}`;

      await db.insert(directMessages).values({
        teamId,
        userId: actorId,
        discoveredPostId: post.id,
        recipientUsername: recipient,
        subject,
        body: body.slice(0, 2000),
        status: "pending_review",
      });
      existingPostIds.add(post.id);
      created++;
    } catch (error) {
      console.error(`[sync-team] dm ${post.redditId}:`, error);
      continue;
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

  const warmup = await syncTeamWarmup(db, teamId, { userId }).catch((error) => {
    const msg = error instanceof Error ? error.message : "Erreur sync warmup";
    redditError = msg;
    return { created: 0, error: msg };
  });

  const replies = await syncTeamReplies(db, teamId, { userId }).catch((error) => {
    redditError =
      redditError ??
      (error instanceof Error ? error.message : "Erreur sync reply");
    return { created: 0, scraped: 0, error: redditError };
  });

  const dms = await syncTeamDms(db, teamId, { userId }).catch((error) => {
    const msg = error instanceof Error ? error.message : "Erreur sync DM";
    redditError = redditError ?? msg;
    return { created: 0, error: msg };
  });

  await touchTeamSync(db, teamId);

  return { teamId, replies, warmup, dms, redditError };
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
