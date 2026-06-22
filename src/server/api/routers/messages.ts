import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import { generatedMessages } from "@/server/db/schema";
import { buildRedditPostUrl } from "@/server/reddit/client";
import { getMaxPostAgeDate } from "@/server/reddit/freshness";
import {
  syncTeamReplies,
  syncTeamWarmup,
} from "@/server/jobs/sync-team";
import { getTeamTargeting } from "@/server/reddit/scraper";
import { isInTargetSubreddit, isRelevantToIcp } from "@/server/reddit/client";

function formatMessage(row: typeof generatedMessages.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    redditId: row.redditId,
    subreddit: row.subreddit,
    title: row.title,
    author: row.author ?? "unknown",
    permalink: buildRedditPostUrl(
      row.subreddit,
      row.redditId,
      row.permalink,
    ),
    postBody: row.postBody,
    generatedBody: row.generatedBody,
    relevanceScore: row.relevanceScore ? Number(row.relevanceScore) : null,
    safetyScore: row.safetyScore,
    isSent: row.isSent,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    redditCreatedAt: row.redditCreatedAt,
  };
}

export const messagesRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z.object({
        type: z.enum(["reply", "warmup"]),
        pendingOnly: z.boolean().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const targeting = await getTeamTargeting(ctx.db!, ctx.teamId);
      const { keywords, subreddits } = targeting;

      const conditions = [
        eq(generatedMessages.teamId, ctx.teamId),
        eq(generatedMessages.type, input.type),
        gte(generatedMessages.createdAt, getMaxPostAgeDate()),
      ];

      if (input.pendingOnly) {
        conditions.push(eq(generatedMessages.isSent, false));
      }

      const rows = await ctx.db!.query.generatedMessages.findMany({
        where: and(...conditions),
        orderBy: [
          desc(generatedMessages.relevanceScore),
          desc(generatedMessages.redditCreatedAt),
          desc(generatedMessages.createdAt),
        ],
      });

      return rows
        .filter(
          (row) =>
            isInTargetSubreddit(row.subreddit, subreddits) &&
            isRelevantToIcp(
              row.title,
              row.postBody ?? "",
              keywords,
              subreddits,
              row.subreddit,
            ),
        )
        .map(formatMessage);
    }),

  syncReply: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamReplies(ctx.db!, ctx.teamId, {
      userId: ctx.session.user.id,
      maxNew: 8,
    });
  }),

  syncWarmup: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamWarmup(ctx.db!, ctx.teamId, {
      userId: ctx.session.user.id,
      maxNew: 5,
    });
  }),

  toggleSent: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isSent: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db!.query.generatedMessages.findFirst({
        where: and(
          eq(generatedMessages.id, input.id),
          eq(generatedMessages.teamId, ctx.teamId),
        ),
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db!
        .update(generatedMessages)
        .set({
          isSent: input.isSent,
          sentAt: input.isSent ? new Date() : null,
          sentByUserId: input.isSent ? ctx.session.user.id : null,
        })
        .where(eq(generatedMessages.id, input.id));

      return { id: input.id, isSent: input.isSent };
    }),

  markViewed: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db!.query.generatedMessages.findFirst({
        where: and(
          eq(generatedMessages.id, input.id),
          eq(generatedMessages.teamId, ctx.teamId),
        ),
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db!
        .update(generatedMessages)
        .set({ viewedAt: new Date() })
        .where(eq(generatedMessages.id, input.id));

      return { id: input.id };
    }),
});
