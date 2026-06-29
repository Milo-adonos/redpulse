import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  discoveredPosts,
  keywordFilters,
  projects,
  responseTemplates,
  teamRedditProfiles,
  teamSettings,
} from "@/server/db/schema";
import {
  parseRedditProfileUrl,
  persistTeamRedditProfile,
} from "@/server/reddit/reddit-account";
import { refreshTeamSubreddits } from "@/server/reddit/scraper";
import {
  listSubredditVoicesForTeam,
} from "@/server/reddit/subreddit-voice";
import {
  analyzeProductFromSite,
  extractKeywords,
} from "@/server/project/site-analysis";

export const settingsRouter = createTRPCRouter({
  get: teamProcedure.query(async ({ ctx }) => {
    const [filters, project, settings, redditProfile] = await Promise.all([
      ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      }),
      ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      }),
      ctx.db!.query.teamSettings.findFirst({
        where: eq(teamSettings.teamId, ctx.teamId),
      }),
      ctx.db!.query.teamRedditProfiles.findFirst({
        where: eq(teamRedditProfiles.teamId, ctx.teamId),
      }),
    ]);

    return {
      projectName: project?.name ?? "",
      siteUrl: project?.siteUrl ?? "",
      redditProfileUrl: redditProfile?.profileUrl ?? "",
      description: project?.description ?? "",
      productPrompt: project?.productPrompt ?? project?.description ?? "",
      industry: project?.keywords?.find((k) => k.startsWith("__industry:"))?.replace("__industry:", "") ?? "",
      subreddits: (filters?.subreddits ?? []).slice(0, 10),
      keywords: (filters?.keywords ?? project?.keywords ?? []).filter(
        (k) => !k.startsWith("__industry:"),
      ),
      responseLanguage: "en" as const,
      replyMinScore: settings?.replyMinScore ?? 80,
      warmupMinScore: settings?.warmupMinScore ?? 40,
      influenceMinScore: settings?.influenceMinScore ?? 65,
      postsPerDay: settings?.postsPerDay ?? 25,
      discoveryMode:
        (settings?.replyMinScore ?? 80) >= 85
          ? ("safe" as const)
          : (settings?.replyMinScore ?? 80) <= 70
            ? ("aggressive" as const)
            : ("balanced" as const),
      discoverySince: settings?.discoverySince ?? "",
    };
  }),

  getSubredditScores: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!
      .select({
        subreddit: discoveredPosts.subreddit,
        matchScore: sql<number>`coalesce(avg(${discoveredPosts.relevanceScore}), 0)::int`,
        postCount: sql<number>`count(*)::int`,
      })
      .from(discoveredPosts)
      .where(eq(discoveredPosts.teamId, ctx.teamId))
      .groupBy(discoveredPosts.subreddit)
      .orderBy(desc(sql`avg(${discoveredPosts.relevanceScore})`));

    return rows.map((r) => ({
      subreddit: r.subreddit,
      matchScore: r.matchScore ?? 0,
      postCount: r.postCount ?? 0,
    }));
  }),

  getSubredditVoices: teamProcedure.query(async ({ ctx }) => {
    const filter = await ctx.db!.query.keywordFilters.findFirst({
      where: eq(keywordFilters.teamId, ctx.teamId),
    });
    const subreddits = (filter?.subreddits ?? []).slice(0, 10);
    return listSubredditVoicesForTeam(ctx.db!, ctx.teamId, subreddits);
  }),

  listCompetitors: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!.query.responseTemplates.findMany({
      where: and(
        eq(responseTemplates.teamId, ctx.teamId),
        eq(responseTemplates.name, "competitor"),
      ),
    });
    return rows.map((r) => ({ id: r.id, url: r.body }));
  }),

  addCompetitor: teamProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db!
        .insert(responseTemplates)
        .values({
          teamId: ctx.teamId,
          name: "competitor",
          body: input.url,
        })
        .returning();
      return { id: row!.id, url: input.url };
    }),

  removeCompetitor: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .delete(responseTemplates)
        .where(
          and(
            eq(responseTemplates.id, input.id),
            eq(responseTemplates.teamId, ctx.teamId),
            eq(responseTemplates.name, "competitor"),
          ),
        );
      return { ok: true };
    }),

  updateDiscovery: teamProcedure
    .input(
      z.object({
        mode: z.enum(["safe", "balanced", "aggressive"]).optional(),
        postsPerDay: z.number().min(5).max(50).optional(),
        replyMinScore: z.number().min(0).max(100).optional(),
        warmupMinScore: z.number().min(0).max(100).optional(),
        influenceMinScore: z.number().min(0).max(100).optional(),
        discoverySince: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const presets = {
        safe: { reply: 85, warmup: 50, influence: 70 },
        balanced: { reply: 80, warmup: 40, influence: 65 },
        aggressive: { reply: 65, warmup: 30, influence: 50 },
      };

      const scores = input.mode ? presets[input.mode] : null;

      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          replyMinScore: scores?.reply ?? input.replyMinScore ?? 80,
          warmupMinScore: scores?.warmup ?? input.warmupMinScore ?? 40,
          influenceMinScore: scores?.influence ?? input.influenceMinScore ?? 65,
          postsPerDay: input.postsPerDay ?? 25,
          discoverySince: input.discoverySince || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            ...(scores
              ? {
                  replyMinScore: scores.reply,
                  warmupMinScore: scores.warmup,
                  influenceMinScore: scores.influence,
                }
              : {
                  ...(input.replyMinScore != null
                    ? { replyMinScore: input.replyMinScore }
                    : {}),
                  ...(input.warmupMinScore != null
                    ? { warmupMinScore: input.warmupMinScore }
                    : {}),
                  ...(input.influenceMinScore != null
                    ? { influenceMinScore: input.influenceMinScore }
                    : {}),
                }),
            ...(input.postsPerDay != null ? { postsPerDay: input.postsPerDay } : {}),
            ...(input.discoverySince
              ? { discoverySince: input.discoverySince }
              : {}),
            updatedAt: new Date(),
          },
        });
      return { ok: true };
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
        productPrompt: z.string().max(8000).optional(),
        industry: z.string().max(200).optional(),
        keywords: z.array(z.string()).max(30).optional(),
        redditProfileUrl: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      });

      const keywords =
        input.keywords ??
        (input.description ? extractKeywords(input.description) : undefined);

      const withIndustry = [
        ...(keywords ?? existing?.keywords ?? []).filter(
          (k) => !k.startsWith("__industry:"),
        ),
        ...(input.industry?.trim()
          ? [`__industry:${input.industry.trim()}`]
          : []),
      ];

      const productPrompt =
        input.productPrompt ?? input.description ?? existing?.productPrompt;

      if (existing) {
        await ctx.db!
          .update(projects)
          .set({
            name: input.name ?? existing.name,
            siteUrl: input.siteUrl,
            description: input.description || existing.name,
            productPrompt,
            keywords: withIndustry.length ? withIndustry : keywords ?? existing.keywords,
            updatedAt: new Date(),
          })
          .where(eq(projects.teamId, ctx.teamId));
      } else {
        await ctx.db!.insert(projects).values({
          teamId: ctx.teamId,
          name: input.name ?? "Mon projet",
          siteUrl: input.siteUrl,
          description: input.description || "Produit à promouvoir",
          productPrompt,
          keywords: withIndustry.length ? withIndustry : keywords ?? [],
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

      if (input.redditProfileUrl !== undefined) {
        const trimmed = input.redditProfileUrl.trim();
        if (!trimmed) {
          await ctx.db!
            .delete(teamRedditProfiles)
            .where(eq(teamRedditProfiles.teamId, ctx.teamId));
        } else if (!parseRedditProfileUrl(trimmed)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "URL de profil Reddit invalide.",
          });
        } else {
          const scraped = await persistTeamRedditProfile(
            ctx.db!,
            ctx.teamId,
            trimmed,
          );
          if (!scraped) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Impossible de récupérer ce profil Reddit. Vérifiez l'URL.",
            });
          }
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
        subreddits: z.array(z.string()).min(1).max(10),
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

  updateRelevanceScores: teamProcedure
    .input(
      z.object({
        replyMinScore: z.number().min(0).max(100),
        warmupMinScore: z.number().min(0).max(100),
        influenceMinScore: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .insert(teamSettings)
        .values({
          teamId: ctx.teamId,
          replyMinScore: input.replyMinScore,
          warmupMinScore: input.warmupMinScore,
          influenceMinScore: input.influenceMinScore,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: teamSettings.teamId,
          set: {
            replyMinScore: input.replyMinScore,
            warmupMinScore: input.warmupMinScore,
            influenceMinScore: input.influenceMinScore,
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
