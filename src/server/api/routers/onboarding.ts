import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  onboardingSessions,
  teamMembers,
  teamSettings,
  teams,
  users,
} from "@/server/db/schema";
import {
  analyzeScrapedContent,
  scrapeLandingPage,
} from "@/server/project/onboarding-analysis";
import { activateOnboardingSession } from "@/server/onboarding/activate-session";
import type { PlanId } from "@/lib/plans";
import { getPlanMessageQuota, planToTeamPlan } from "@/lib/plans";
import { slugify } from "@/lib/utils";

const planSchema = z.enum(["starter", "growth", "pro"]);

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  new URL(withProtocol);
  return withProtocol;
}

function sessionPayload(session: typeof onboardingSessions.$inferSelect) {
  return {
    id: session.id,
    url: session.url,
    domain: (() => {
      try {
        return new URL(session.url).hostname.replace(/^www\./, "");
      } catch {
        return session.url;
      }
    })(),
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(session.url)}&sz=64`,
    productName: session.productName,
    tagline: session.tagline,
    problemSolved: session.problemSolved,
    targetAudience: session.targetAudience,
    keyFeatures: session.keyFeatures ?? [],
    productPrompt: session.productPrompt,
    suggestedSubreddits: session.suggestedSubreddits ?? [],
    suggestedKeywords: session.suggestedKeywords ?? [],
    competitors: session.competitors ?? [],
    projectName: session.projectName ?? session.productName,
    firstName: session.firstName,
    lastName: session.lastName,
    email: session.email,
    plan: session.plan as PlanId | null,
    paid: session.paid,
    completed: session.completed,
    stripeSessionId: session.stripeSessionId,
  };
}

export const onboardingRouter = createTRPCRouter({
  startScrape: publicProcedure
    .input(z.object({ url: z.string().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      let url: string;
      try {
        url = normalizeUrl(input.url);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "URL invalide",
        });
      }

      const scraped = await scrapeLandingPage(url);

      const [session] = await ctx.db
        .insert(onboardingSessions)
        .values({
          url: scraped.url,
          scrapedText: scraped.pageText,
        })
        .returning();

      return {
        sessionId: session!.id,
        url: scraped.url,
        domain: scraped.domain,
        favicon: scraped.favicon,
      };
    }),

  runAnalysis: publicProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const session = await ctx.db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, input.sessionId),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      if (session.productName && session.productPrompt) {
        return sessionPayload(session);
      }

      const pageText = session.scrapedText ?? "";
      const analysis = await analyzeScrapedContent({
        title: session.productName ?? session.url,
        description: session.tagline ?? "",
        pageText,
        url: session.url,
      });

      const [updated] = await ctx.db
        .update(onboardingSessions)
        .set({
          productName: analysis.product_name,
          tagline: analysis.tagline,
          problemSolved: analysis.problem_solved,
          targetAudience: analysis.target_audience,
          keyFeatures: analysis.key_features,
          productPrompt: analysis.product_prompt,
          suggestedSubreddits: analysis.suggested_subreddits,
          suggestedKeywords: analysis.suggested_keywords,
          competitors: analysis.competitors,
          projectName: analysis.product_name,
        })
        .where(eq(onboardingSessions.id, input.sessionId))
        .returning();

      return sessionPayload(updated!);
    }),

  analyze: publicProcedure
    .input(z.object({ url: z.string().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      let url: string;
      try {
        url = normalizeUrl(input.url);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "URL invalide",
        });
      }

      const scraped = await scrapeLandingPage(url);
      const analysis = await analyzeScrapedContent(scraped);

      const [session] = await ctx.db
        .insert(onboardingSessions)
        .values({
          url: scraped.url,
          scrapedText: scraped.pageText,
          productName: analysis.product_name,
          tagline: analysis.tagline,
          problemSolved: analysis.problem_solved,
          targetAudience: analysis.target_audience,
          keyFeatures: analysis.key_features,
          productPrompt: analysis.product_prompt,
          suggestedSubreddits: analysis.suggested_subreddits,
          suggestedKeywords: analysis.suggested_keywords,
          competitors: analysis.competitors,
          projectName: analysis.product_name,
        })
        .returning();

      return {
        sessionId: session!.id,
        ...sessionPayload(session!),
      };
    }),

  getSession: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const session = await ctx.db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, input.id),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      return sessionPayload(session);
    }),

  saveAccountDetails: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet email est déjà utilisé",
        });
      }

      const [session] = await ctx.db
        .update(onboardingSessions)
        .set({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.trim().toLowerCase(),
        })
        .where(eq(onboardingSessions.id, input.id))
        .returning();

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      return sessionPayload(session);
    }),

  completeOnboarding: publicProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        plan: planSchema,
        password: z.string().min(8).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const session = await ctx.db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.id, input.sessionId),
      });

      if (!session || session.completed) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      if (!session.email || !session.firstName || !session.lastName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Complétez vos informations avant de choisir un plan",
        });
      }

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, session.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet email est déjà utilisé",
        });
      }

      const plan = input.plan;
      const messagesLimit = getPlanMessageQuota(plan);
      const passwordHash = await bcrypt.hash(input.password, 12);
      const fullName = `${session.firstName} ${session.lastName}`.trim();
      const teamSlug =
        slugify(`${session.firstName}-${session.lastName}`) + "-" + Date.now().toString(36);
      const teamName = session.projectName ?? session.productName ?? fullName;
      const now = new Date();

      await ctx.db
        .update(onboardingSessions)
        .set({ plan })
        .where(eq(onboardingSessions.id, input.sessionId));

      const [user] = await ctx.db
        .insert(users)
        .values({
          email: session.email,
          passwordHash,
          name: fullName,
          firstName: session.firstName,
          lastName: session.lastName,
          plan,
          messagesLimit,
          messagesUsed: 0,
          planStartedAt: now,
          messagesResetAt: now,
        })
        .returning();

      const [team] = await ctx.db
        .insert(teams)
        .values({
          name: teamName,
          slug: teamSlug,
          ownerId: user!.id,
          plan: planToTeamPlan(plan),
        })
        .returning();

      await ctx.db.insert(teamMembers).values({
        teamId: team!.id,
        userId: user!.id,
        role: "owner",
      });

      await ctx.db.insert(teamSettings).values({ teamId: team!.id });

      await activateOnboardingSession(ctx.db, user!.id, team!.id, input.sessionId, {
        requirePaid: false,
      });

      return {
        userId: user!.id,
        teamId: team!.id,
        email: user!.email,
      };
    }),

  updateProjectName: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        projectName: z.string().min(2).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const [session] = await ctx.db
        .update(onboardingSessions)
        .set({ projectName: input.projectName.trim() })
        .where(eq(onboardingSessions.id, input.id))
        .returning();

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      return sessionPayload(session);
    }),

  getByStripeSession: publicProcedure
    .input(z.object({ stripeSessionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const session = await ctx.db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.stripeSessionId, input.stripeSessionId),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session introuvable" });
      }

      return sessionPayload(session);
    }),
});
