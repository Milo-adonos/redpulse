import { z } from "zod";
import { and, count, eq, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  generatedMessages,
  projects,
  teamInvites,
  teamMembers,
  teams,
  teamSettings,
  users,
} from "@/server/db/schema";
import {
  buildDashboardData,
  refreshDashboard,
} from "@/server/dashboard/metrics";
import { processTeamInvite } from "@/server/team/context";
import { getPlanUsage } from "@/server/plan/usage";
import { PLANS } from "@/lib/plans";

const SECTION_LABELS: Record<string, string> = {
  reply: "Reply",
  warmup: "Warmup",
  influence: "Influence",
  post: "Posts",
};

export const teamRouter = createTRPCRouter({
  getContext: teamProcedure.query(async ({ ctx }) => {
    const [project, team, memberCount, settings, owner, planUsage] = await Promise.all([
      ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      }),
      ctx.db!.query.teams.findFirst({
        where: eq(teams.id, ctx.teamId),
      }),
      ctx.db!
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, ctx.teamId)),
      ctx.db!.query.teamSettings.findFirst({
        where: eq(teamSettings.teamId, ctx.teamId),
      }),
      ctx.db!.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      }),
      getPlanUsage(ctx.db!, ctx.teamId),
    ]);

    const planInfo = PLANS[planUsage.plan];

    return {
      teamId: ctx.teamId,
      role: ctx.role,
      teamName: team?.name ?? "Équipe",
      project: project
        ? {
            id: project.id,
            name: project.name,
            siteUrl: project.siteUrl,
            description: project.description,
          }
        : null,
      memberCount: memberCount[0]?.count ?? 0,
      lastSyncedAt: settings?.updatedAt ?? null,
      user: owner
        ? {
            firstName: owner.firstName,
            lastName: owner.lastName,
            name: owner.name,
            email: owner.email,
          }
        : null,
      plan: {
        id: planUsage.plan,
        name: planInfo.name,
        messagesUsed: planUsage.messagesUsed,
        messagesLimit: planUsage.messagesLimit,
      },
    };
  }),

  getOverview: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!.query.generatedMessages.findMany({
      where: eq(generatedMessages.teamId, ctx.teamId),
    });

    const sent = rows.filter((m) => m.isSent);
    const generatedCount = rows.length;
    const sentCount = sent.length;

    const sectionCounts = new Map<string, number>();
    const allowedSections = ["reply", "warmup", "influence"] as const;
    for (const msg of rows) {
      if (!allowedSections.includes(msg.type as (typeof allowedSections)[number])) continue;
      sectionCounts.set(msg.type, (sectionCounts.get(msg.type) ?? 0) + 1);
    }
    const generatedInSections = [...sectionCounts.values()].reduce((a, b) => a + b, 0);
    const sectionSplit = [...sectionCounts.entries()].map(([type, count]) => ({
      type,
      label: SECTION_LABELS[type] ?? type,
      count,
      pct: generatedInSections ? Math.round((count / generatedInSections) * 100) : 0,
    }));

    const avgBanScore =
      rows.length > 0
        ? Math.round(
            (rows.reduce((sum, m) => sum + (m.safetyScore ?? 0), 0) / rows.length) *
              10,
          ) / 10
        : 0;

    const subredditCounts = new Map<string, number>();
    for (const msg of sent) {
      subredditCounts.set(
        msg.subreddit,
        (subredditCounts.get(msg.subreddit) ?? 0) + 1,
      );
    }

    const totalSentSubs =
      [...subredditCounts.values()].reduce((a, b) => a + b, 0) || 1;

    const subredditSplit = [...subredditCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name: `r/${name}`,
        count,
        pct: Math.round((count / totalSentSubs) * 100),
      }));

    const members = await ctx.db!
      .select({
        name: users.name,
        email: users.email,
        role: teamMembers.role,
        userId: users.id,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, ctx.teamId));

    const teamActivity = await Promise.all(
      members.map(async (m) => {
        const sentByUser = await ctx.db!
          .select({ count: count() })
          .from(generatedMessages)
          .where(
            and(
              eq(generatedMessages.teamId, ctx.teamId),
              eq(generatedMessages.sentByUserId, m.userId),
              eq(generatedMessages.isSent, true),
            ),
          );
        const generatedByUser = await ctx.db!
          .select({ count: count() })
          .from(generatedMessages)
          .where(
            and(
              eq(generatedMessages.teamId, ctx.teamId),
              eq(generatedMessages.generatedByUserId, m.userId),
            ),
          );
        return {
          name: m.name ?? m.email,
          email: m.email,
          role: m.role,
          messagesSent: sentByUser[0]?.count ?? 0,
          messagesGenerated: generatedByUser[0]?.count ?? 0,
        };
      }),
    );

    return {
      sentCount,
      generatedCount,
      sectionSplit,
      avgBanScore,
      subredditSplit,
      teamActivity,
    };
  }),

  getDashboard: teamProcedure.query(async ({ ctx }) => {
    return buildDashboardData(ctx.db!, ctx.teamId);
  }),

  refreshDashboard: teamProcedure.mutation(async ({ ctx }) => {
    return refreshDashboard(ctx.db!, ctx.teamId);
  }),

  listMembers: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!
      .select({
        id: teamMembers.id,
        name: users.name,
        email: users.email,
        role: teamMembers.role,
        userId: users.id,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, ctx.teamId));

    const withStats = await Promise.all(
      rows.map(async (m) => {
        const sent = await ctx.db!
          .select({ count: count() })
          .from(generatedMessages)
          .where(
            and(
              eq(generatedMessages.teamId, ctx.teamId),
              eq(generatedMessages.sentByUserId, m.userId),
              eq(generatedMessages.isSent, true),
            ),
          );
        return {
          ...m,
          messagesSent: sent[0]?.count ?? 0,
        };
      }),
    );

    return withStats;
  }),

  listPendingInvites: teamProcedure.query(async ({ ctx }) => {
    return ctx.db!.query.teamInvites.findMany({
      where: and(
        eq(teamInvites.teamId, ctx.teamId),
        isNull(teamInvites.acceptedAt),
      ),
    });
  }),

  inviteMember: teamProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await processTeamInvite(
        ctx.db!,
        ctx.teamId,
        input.email,
        ctx.session.user.id,
        input.role,
      );

      return {
        email: result.email,
        status: result.status,
      };
    }),

  acceptInvite: teamProcedure
    .input(z.object({ token: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db!.query.teamInvites.findFirst({
        where: and(
          eq(teamInvites.token, input.token),
          eq(teamInvites.email, ctx.session.user.email!),
        ),
      });

      if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invitation invalide" });
      }

      await ctx.db!
        .insert(teamMembers)
        .values({
          teamId: invite.teamId,
          userId: ctx.session.user.id,
          role: invite.role,
        })
        .onConflictDoNothing();

      await ctx.db!
        .update(teamInvites)
        .set({ acceptedAt: new Date() })
        .where(eq(teamInvites.id, invite.id));

      return { teamId: invite.teamId };
    }),
});
