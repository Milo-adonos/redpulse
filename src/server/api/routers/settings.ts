import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  keywordFilters,
  projects,
  responseTemplates,
  teamSettings,
} from "@/server/db/schema";

export const settingsRouter = createTRPCRouter({
  get: teamProcedure.query(async ({ ctx }) => {
    const [filters, settings, project] = await Promise.all([
      ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      }),
      ctx.db!.query.teamSettings.findFirst({
        where: eq(teamSettings.teamId, ctx.teamId),
      }),
      ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      }),
    ]);

    return {
      siteUrl: project?.siteUrl ?? "",
      description: project?.description ?? "",
      subreddits: filters?.subreddits ?? [
        "SaaS",
        "startups",
        "marketing",
        "entrepreneur",
        "growth",
      ],
      keywords: filters?.keywords ?? [
        "automation",
        "SaaS",
        "growth",
        "marketing",
        "startup",
      ],
      responseLanguage: (settings?.responseLanguage ?? "fr") as "fr" | "en",
    };
  }),

  updateProject: teamProcedure
    .input(
      z.object({
        siteUrl: z.string().url(),
        description: z.string().max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      });

      if (existing) {
        await ctx.db!
          .update(projects)
          .set({
            siteUrl: input.siteUrl,
            description: input.description || existing.name,
            updatedAt: new Date(),
          })
          .where(eq(projects.teamId, ctx.teamId));
      } else {
        await ctx.db!.insert(projects).values({
          teamId: ctx.teamId,
          name: "Mon projet",
          siteUrl: input.siteUrl,
          description: input.description || "Produit à promouvoir",
        });
      }

      return { ok: true };
    }),

  updateLanguage: teamProcedure
    .input(z.object({ responseLanguage: z.enum(["fr", "en"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          responseLanguage: input.responseLanguage,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            responseLanguage: input.responseLanguage,
            updatedAt: new Date(),
          },
        });
      return { ok: true };
    }),

  updateFilters: teamProcedure
    .input(
      z.object({
        subreddits: z.array(z.string()).min(1).max(20),
        keywords: z.array(z.string()).min(1).max(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      });

      if (existing) {
        await ctx.db!
          .update(keywordFilters)
          .set({
            subreddits: input.subreddits.map((s) =>
              s.replace(/^r\//i, ""),
            ),
            keywords: input.keywords,
            isActive: true,
          })
          .where(eq(keywordFilters.id, existing.id));
      } else {
        await ctx.db!.insert(keywordFilters).values({
          teamId: ctx.teamId,
          subreddits: input.subreddits.map((s) => s.replace(/^r\//i, "")),
          keywords: input.keywords,
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
