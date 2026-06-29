import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  keywordFilters,
  onboardingSessions,
  projects,
  teamMembers,
  teamSettings,
  teams,
} from "@/server/db/schema";
import type { PlanId } from "@/lib/plans";
import { planToTeamPlan } from "@/lib/plans";
import { runInitialTeamScrape } from "@/server/jobs/sync-section";

export async function activateOnboardingSession(
  db: Database,
  userId: string,
  teamId: string,
  sessionId: string,
  options?: { requirePaid?: boolean },
) {
  const requirePaid = options?.requirePaid ?? false;

  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });

  if (!session || session.completed) {
    return null;
  }

  if (requirePaid && !session.paid) {
    return null;
  }

  const membership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, teamId),
      eq(teamMembers.userId, userId),
      eq(teamMembers.role, "owner"),
    ),
  });

  if (!membership) return null;

  const projectName = session.projectName ?? session.productName ?? "Mon projet";
  const productPrompt = session.productPrompt ?? session.problemSolved ?? projectName;
  const keywords = session.suggestedKeywords ?? [];
  const competitors = session.competitors ?? [];
  const subreddits = (session.suggestedSubreddits ?? []).map((s) =>
    s.replace(/^r\//i, ""),
  );
  const plan = (session.plan as PlanId | null) ?? "starter";

  await db
    .insert(projects)
    .values({
      teamId,
      name: projectName,
      siteUrl: session.url,
      description: productPrompt,
      productPrompt,
      keywords,
      competitors,
    })
    .onConflictDoUpdate({
      target: projects.teamId,
      set: {
        name: projectName,
        siteUrl: session.url,
        description: productPrompt,
        productPrompt,
        keywords,
        competitors,
        updatedAt: new Date(),
      },
    });

  await db
    .update(teams)
    .set({
      name: projectName,
      plan: planToTeamPlan(plan),
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));

  await db.insert(teamSettings).values({ teamId }).onConflictDoNothing();

  const existingFilter = await db.query.keywordFilters.findFirst({
    where: eq(keywordFilters.teamId, teamId),
  });

  if (existingFilter) {
    await db
      .update(keywordFilters)
      .set({ keywords, subreddits, isActive: true })
      .where(eq(keywordFilters.id, existingFilter.id));
  } else {
    await db.insert(keywordFilters).values({
      teamId,
      keywords,
      subreddits,
      isActive: true,
    });
  }

  await db
    .update(onboardingSessions)
    .set({ completed: true })
    .where(eq(onboardingSessions.id, sessionId));

  void runInitialTeamScrape(db, teamId).catch((error) => {
    console.error("[onboarding] initial scrape:", error);
  });

  return session;
}
