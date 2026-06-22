import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import { generatedMessages } from "@/server/db/schema";
import {
  runFullTeamSync,
  syncTeamReplies,
  syncTeamWarmup,
} from "@/server/jobs/sync-team";

function formatMessage(row: typeof generatedMessages.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    redditId: row.redditId,
    subreddit: row.subreddit,
    title: row.title,
    author: row.author ?? "unknown",
    permalink: row.permalink,
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
    .input(z.object({ type: z.enum(["reply", "warmup"]) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db!.query.generatedMessages.findMany({
        where: and(
          eq(generatedMessages.teamId, ctx.teamId),
          eq(generatedMessages.type, input.type),
        ),
        orderBy: [
          desc(generatedMessages.relevanceScore),
          desc(generatedMessages.createdAt),
        ],
      });
      return rows.map(formatMessage);
    }),

  syncReply: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamReplies(ctx.db!, ctx.teamId, {
      userId: ctx.session.user.id,
    });
  }),

  syncWarmup: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamWarmup(ctx.db!, ctx.teamId, {
      userId: ctx.session.user.id,
    });
  }),

  syncAll: teamProcedure.mutation(async ({ ctx }) => {
    const result = await runFullTeamSync(ctx.db!, ctx.teamId, ctx.session.user.id);
    if (result.redditError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result.redditError,
      });
    }
    return result;
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
});
