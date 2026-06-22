import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  keywordFilters,
  projects,
  responseTemplates,
  teamSettings,
} from "@/server/db/schema";
import { refreshTeamSubreddits } from "@/server/reddit/scraper";
import {
  analyzeProductFromSite,
  extractKeywords,
} from "@/server/project/site-analysis";

export const settingsRouter = createTRPCRouter({
  get: teamProcedure.query(async ({ ctx }) => {
    const [filters, project] = await Promise.all([
      ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      }),
      ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      }),
    ]);

    return {
      projectName: project?.name ?? "",
      siteUrl: project?.siteUrl ?? "",
      description: project?.description ?? "",
      subreddits: filters?.subreddits ?? [],
      keywords: filters?.keywords ?? project?.keywords ?? [
        "automation",
        "SaaS",
        "growth",
        "marketing",
        "startup",
      ],
      responseLanguage: "en" as const,
    };
  }),

  analyzeSite: teamProcedure
    .input(z.object({ url: z.string().min(3).max(500) }))
    .mutation(async ({ input }) => {
      return analyzeProductFromSite(input.url);
    }),

  rediscoverSubreddits: teamProcedure.mutation(async ({ ctx }) => {
    const subreddits = await refreshTeamSubreddits(ctx.db!, ctx.teamId);
    return { subreddits };
  }),

  updateProject: teamProcedure
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        siteUrl: z.string().url(),
        description: z.string().max(4000),
        keywords: z.array(z.string()).max(30).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      });

      const keywords =
        input.keywords ??
        (input.description ? extractKeywords(input.description) : undefined);

      if (existing) {
        await ctx.db!
          .update(projects)
          .set({
            name: input.name ?? existing.name,
            siteUrl: input.siteUrl,
            description: input.description || existing.name,
            keywords: keywords ?? existing.keywords,
            updatedAt: new Date(),
          })
          .where(eq(projects.teamId, ctx.teamId));
      } else {
        await ctx.db!.insert(projects).values({
          teamId: ctx.teamId,
          name: input.name ?? "Mon projet",
          siteUrl: input.siteUrl,
          description: input.description || "Produit à promouvoir",
          keywords: keywords ?? [],
        });
      }

      if (keywords?.length) {
        const filter = await ctx.db!.query.keywordFilters.findFirst({
          where: eq(keywordFilters.teamId, ctx.teamId),
        });
        if (filter) {
          await ctx.db!
            .update(keywordFilters)
            .set({ keywords, isActive: true })
            .where(eq(keywordFilters.id, filter.id));
        }
      }

      return { ok: true };
    }),

  updateLanguage: teamProcedure.mutation(async ({ ctx }) => {
    await ctx.db!
      .insert(teamSettings)
      .values({
        teamId: ctx.teamId,
        responseLanguage: "en",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: teamSettings.teamId,
        set: {
          responseLanguage: "en",
          updatedAt: new Date(),
        },
      });
    return { ok: true };
  }),

  updateFilters: teamProcedure
    .input(
      z.object({
        keywords: z.array(z.string()).min(1).max(30),
        subreddits: z.array(z.string()).min(1).max(20),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      });

      const subreddits = input.subreddits.map((s) => s.replace(/^r\//i, ""));

      if (existing) {
        await ctx.db!
          .update(keywordFilters)
          .set({
            keywords: input.keywords,
            subreddits,
            isActive: true,
          })
          .where(eq(keywordFilters.id, existing.id));
      } else {
        await ctx.db!.insert(keywordFilters).values({
          teamId: ctx.teamId,
          keywords: input.keywords,
          subreddits,
          isActive: true,
        });
      }

      return { ok: true };
    }),

  updateSecurity: teamProcedure
    .input(
      z.object({
        repliesPerHour: z.number().min(1).max(50),
        postsPerDay: z.number().min(1).max(20),
        maxBanRisk: z.number().min(0).max(1),
        charLimit: z.number().min(100).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          repliesPerHour: input.repliesPerHour,
          postsPerDay: input.postsPerDay,
          maxBanRisk: String(input.maxBanRisk),
          charLimit: input.charLimit,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            repliesPerHour: input.repliesPerHour,
            postsPerDay: input.postsPerDay,
            maxBanRisk: String(input.maxBanRisk),
            charLimit: input.charLimit,
            updatedAt: new Date(),
          },
        });

      return { ok: true };
    }),

  updateWarmup: teamProcedure
    .input(
      z.object({
        warmupEnabled: z.boolean(),
        warmupActionsPerDay: z.number().min(1).max(20),
        warmupCommentsPerWeek: z.number().min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          warmupEnabled: input.warmupEnabled,
          warmupActionsPerDay: input.warmupActionsPerDay,
          warmupCommentsPerWeek: input.warmupCommentsPerWeek,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            warmupEnabled: input.warmupEnabled,
            warmupActionsPerDay: input.warmupActionsPerDay,
            warmupCommentsPerWeek: input.warmupCommentsPerWeek,
            updatedAt: new Date(),
          },
        });

      return { ok: true };
    }),

  updateAlerts: teamProcedure
    .input(
      z.object({
        alertFrequency: z.enum(["realtime", "hourly", "daily", "weekly"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          alertFrequency: input.alertFrequency,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            alertFrequency: input.alertFrequency,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  listTemplates: teamProcedure.query(async ({ ctx }) => {
    return ctx.db!.query.responseTemplates.findMany({
      where: eq(responseTemplates.teamId, ctx.teamId),
    });
  }),

  saveTemplate: teamProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        body: z.string().min(10).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        await ctx.db!
          .update(responseTemplates)
          .set({ name: input.name, body: input.body })
          .where(
            and(
              eq(responseTemplates.id, input.id),
              eq(responseTemplates.teamId, ctx.teamId),
            ),
          );
        return { id: input.id };
      }
      const [row] = await ctx.db!
        .insert(responseTemplates)
        .values({
          teamId: ctx.teamId,
          name: input.name,
          body: input.body,
        })
        .returning();
      return { id: row!.id };
    }),

  deleteTemplate: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .delete(responseTemplates)
        .where(
          and(
            eq(responseTemplates.id, input.id),
            eq(responseTemplates.teamId, ctx.teamId),
          ),
        );
      return { ok: true };
    }),
});
