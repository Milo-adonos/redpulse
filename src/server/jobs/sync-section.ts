import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  generatedMessages,
  projects,
  teamSettings,
} from "@/server/db/schema";
import { generateSectionMessage, type MessageSection } from "@/server/ai/section-generation";
import { buildRedditPostUrl } from "@/server/reddit/client";
import { getTeamTargeting, scrapeAndScoreTeam } from "@/server/reddit/scraper";
import {
  computeStyleConfidence,
  getProjectIdForTeam,
  getSubredditVoice,
} from "@/server/reddit/subreddit-voice";
import {
  assertMessageQuota,
  incrementMessageUsage,
} from "@/server/plan/usage";

async function getVoiceContext(
  db: Database,
  teamId: string,
  subreddit: string,
) {
  const projectId = await getProjectIdForTeam(db, teamId);
  if (!projectId) {
    return { voiceProfile: null, styleConfidence: 1, hasVoiceProfile: false };
  }
  const voice = await getSubredditVoice(db, projectId, subreddit);
  if (!voice) {
    return { voiceProfile: null, styleConfidence: 1, hasVoiceProfile: false };
  }
  return {
    voiceProfile: voice.voiceProfile,
    styleConfidence: computeStyleConfidence(voice.voiceProfile, voice.sampleSize),
    hasVoiceProfile: true,
  };
}

function productPrompt(project: typeof projects.$inferSelect | null | undefined): string {
  return (
    project?.productPrompt?.trim() ||
    project?.description?.trim() ||
    project?.name ||
    "Product"
  );
}

function nicheFromProject(
  project: typeof projects.$inferSelect | null | undefined,
  keywords: string[],
): string {
  return keywords.slice(0, 5).join(", ") || project?.name || "niche";
}

export async function syncTeamSection(
  db: Database,
  teamId: string,
  section: Exclude<MessageSection, "post">,
) {
  try {
    await scrapeAndScoreTeam(db, teamId);
    await touchTeamSync(db, teamId);
  } catch (error) {
    console.warn(`[sync-section] scrape ${teamId}:`, error);
  }

  const [discovered, targeting] = await Promise.all([
    db.query.discoveredPosts.findMany({
      where: and(
        eq(discoveredPosts.teamId, teamId),
        eq(discoveredPosts.isArchived, false),
      ),
      orderBy: [desc(discoveredPosts.relevanceScore), desc(discoveredPosts.discoveredAt)],
      limit: 100,
    }),
    getTeamTargeting(db, teamId),
  ]);

  const eligible = discovered.filter(
    (post) => post.relevanceSection === section,
  ).length;

  return {
    created: 0,
    eligible,
    minScore: 0,
    scraped: discovered.length,
  };
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

export async function syncTeamPosts() {
  return { created: 0, message: "Posts generated on-demand only" };
}

export async function generateMessageForPost(
  db: Database,
  teamId: string,
  postRedditId: string,
  section: MessageSection,
  userId: string,
) {
  const post = await db.query.discoveredPosts.findFirst({
    where: and(
      eq(discoveredPosts.teamId, teamId),
      eq(discoveredPosts.redditId, postRedditId),
    ),
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const existing = await db.query.generatedMessages.findFirst({
    where: and(
      eq(generatedMessages.teamId, teamId),
      eq(generatedMessages.redditId, postRedditId),
      eq(generatedMessages.type, section),
    ),
  });

  if (existing?.generatedBody) {
    const voice = await getVoiceContext(db, teamId, post.subreddit);
    return {
      id: existing.id,
      generatedBody: existing.generatedBody,
      safetyScore: existing.safetyScore,
      cached: true,
      styleConfidence: voice.styleConfidence,
      hasVoiceProfile: voice.hasVoiceProfile,
    };
  }

  await assertMessageQuota(db, teamId);

  const [project, targeting, voice] = await Promise.all([
    db.query.projects.findFirst({ where: eq(projects.teamId, teamId) }),
    getTeamTargeting(db, teamId),
    getVoiceContext(db, teamId, post.subreddit),
  ]);

  const { keywords } = targeting;
  const prompt = productPrompt(project);
  const niche = nicheFromProject(project, keywords);
  const relevance = post.relevanceScore ?? 50;

  const generated = await generateSectionMessage({
    section,
    productName: project?.name ?? "this",
    productUrl: project?.siteUrl ?? "",
    productPrompt: prompt,
    niche,
    subreddit: post.subreddit,
    postTitle: post.title,
    postBody: post.body ?? undefined,
    voiceProfile: voice.voiceProfile,
  });

  if (existing) {
    await db
      .update(generatedMessages)
      .set({
        generatedBody: generated.message,
        safetyScore: generated.banScore,
        banReason: generated.banReason,
        containsUrl: generated.containsUrl ?? false,
        generatedByUserId: userId,
      })
      .where(eq(generatedMessages.id, existing.id));

    await incrementMessageUsage(db, teamId);

    return {
      id: existing.id,
      generatedBody: generated.message,
      safetyScore: generated.banScore,
      cached: false,
      styleConfidence: voice.styleConfidence,
      hasVoiceProfile: voice.hasVoiceProfile,
    };
  }

  const [row] = await db
    .insert(generatedMessages)
    .values({
      teamId,
      type: section,
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
      generatedBody: generated.message,
      relevanceScore: String(relevance / 100),
      safetyScore: generated.banScore,
      banReason: generated.banReason,
      containsUrl: generated.containsUrl ?? false,
      redditScore: post.score ?? 0,
      generatedByUserId: userId,
      redditCreatedAt: post.discoveredAt,
    })
    .returning({ id: generatedMessages.id });

  await incrementMessageUsage(db, teamId);

  return {
    id: row!.id,
    generatedBody: generated.message,
    safetyScore: generated.banScore,
    cached: false,
    styleConfidence: voice.styleConfidence,
    hasVoiceProfile: voice.hasVoiceProfile,
  };
}

export async function regenerateMessage(
  db: Database,
  teamId: string,
  messageId: string,
  userId: string,
) {
  const row = await db.query.generatedMessages.findFirst({
    where: and(
      eq(generatedMessages.id, messageId),
      eq(generatedMessages.teamId, teamId),
    ),
  });

  if (!row) throw new Error("Message introuvable");

  await assertMessageQuota(db, teamId);

  const project = await db.query.projects.findFirst({
    where: eq(projects.teamId, teamId),
  });
  const { keywords, subreddits } = await getTeamTargeting(db, teamId);
  const prompt = productPrompt(project);
  const niche = nicheFromProject(project, keywords);
  const voice = await getVoiceContext(db, teamId, row.subreddit);

  const generated = await generateSectionMessage({
    section: row.type as MessageSection,
    productName: project?.name ?? "this",
    productUrl: project?.siteUrl ?? "",
    productPrompt: prompt,
    niche,
    subreddit: row.subreddit,
    postTitle: row.title,
    postBody: row.postBody ?? undefined,
    subreddits,
    voiceProfile: voice.voiceProfile,
  });

  const generatedBody =
    row.type === "post" && generated.title
      ? `${generated.title}\n\n${generated.body ?? generated.message}`
      : generated.message;

  await db
    .update(generatedMessages)
    .set({
      generatedBody,
      title: row.type === "post" && generated.title ? generated.title : row.title,
      postBody: row.type === "post" && generated.body ? generated.body : row.postBody,
      safetyScore: generated.banScore,
      banReason: generated.banReason,
      containsUrl: generated.containsUrl ?? false,
      generatedByUserId: userId,
    })
    .where(eq(generatedMessages.id, messageId));

  await incrementMessageUsage(db, teamId);

  return {
    id: messageId,
    generatedBody,
    safetyScore: generated.banScore,
    styleConfidence: voice.styleConfidence,
    hasVoiceProfile: voice.hasVoiceProfile,
  };
}

/** Called once at end of onboarding — scrape + score, no message generation. */
export async function runInitialTeamScrape(db: Database, teamId: string) {
  return scrapeAndScoreTeam(db, teamId);
}
