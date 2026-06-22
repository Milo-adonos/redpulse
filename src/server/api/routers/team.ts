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
import { processTeamInvite } from "@/server/team/context";

export const teamRouter = createTRPCRouter({
  getContext: teamProcedure.query(async ({ ctx }) => {
    const [project, team, memberCount, settings] = await Promise.all([
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
    ]);

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
    };
  }),

  getOverview: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!.query.generatedMessages.findMany({
      where: eq(generatedMessages.teamId, ctx.teamId),
    });

    const sent = rows.filter((m) => m.isSent);
    const generatedCount = rows.length;
    const sentCount = sent.length;

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
        return {
          name: m.name ?? m.email,
          email: m.email,
          role: m.role,
          messagesSent: sentByUser[0]?.count ?? 0,
        };
      }),
    );

    return {
      sentCount,
      generatedCount,
      subredditSplit,
      teamActivity,
    };
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
