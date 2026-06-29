import { and, desc, eq, sql } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  generatedMessages,
  keywordFilters,
} from "@/server/db/schema";

export const analyticsRouter = createTRPCRouter({
  summary: teamProcedure.query(async ({ ctx }) => {
    const [messages, sentMessages, filters, subredditStats] = await Promise.all([
      ctx.db!.query.generatedMessages.findMany({
        where: eq(generatedMessages.teamId, ctx.teamId),
      }),
      ctx.db!.query.generatedMessages.findMany({
        where: and(
          eq(generatedMessages.teamId, ctx.teamId),
          eq(generatedMessages.isSent, true),
        ),
      }),
      ctx.db!.query.keywordFilters.findFirst({
        where: eq(keywordFilters.teamId, ctx.teamId),
      }),
      ctx.db!
        .select({
          subreddit: generatedMessages.subreddit,
          comments: sql<number>`count(*) filter (where ${generatedMessages.isSent} = true)::int`,
          generated: sql<number>`count(*)::int`,
          upvotes: sql<number>`coalesce(sum(${generatedMessages.redditScore}), 0)::int`,
          posts: sql<number>`count(distinct ${generatedMessages.redditId})::int`,
        })
        .from(generatedMessages)
        .where(eq(generatedMessages.teamId, ctx.teamId))
        .groupBy(generatedMessages.subreddit)
        .orderBy(desc(sql`count(*)`)),
    ]);

    const generatedCount = messages.length;
    const sentCount = sentMessages.length;
    const trackedSubreddits = filters?.subreddits?.length ?? 0;

    const subredditPerformance = subredditStats.map((row) => {
      const comments = row.comments ?? 0;
      const generated = row.generated ?? 0;
      const ratio =
        generated > 0 ? Math.round((comments / generated) * 100) : 0;
      return {
        subreddit: `r/${row.subreddit}`,
        comments,
        ratio,
        upvotes: row.upvotes ?? 0,
        posts: row.posts ?? 0,
      };
    });

    return {
      generatedCount,
      sentCount,
      trackedSubreddits,
      subredditPerformance,
    };
  }),
});
