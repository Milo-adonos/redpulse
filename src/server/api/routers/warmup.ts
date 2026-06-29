import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  generatedMessages,
  keywordFilters,
  teamRedditProfiles,
} from "@/server/db/schema";
import { fetchSubredditPosts } from "@/server/reddit/client";
import { generateWarmupReply } from "@/server/ai/anthropic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const warmupRouter = createTRPCRouter({
  getStats: teamProcedure.query(async ({ ctx }) => {
    const warmupMessages = await ctx.db!.query.generatedMessages.findMany({
      where: and(
        eq(generatedMessages.teamId, ctx.teamId),
        eq(generatedMessages.type, "warmup"),
      ),
    });

    const todayStart = startOfToday();
    const commentsToday = warmupMessages.filter(
      (m) => m.isSent && m.sentAt && m.sentAt >= todayStart,
    ).length;

    const redditProfile = await ctx.db!.query.teamRedditProfiles.findFirst({
      where: eq(teamRedditProfiles.teamId, ctx.teamId),
    });

    const karmaGained = redditProfile
      ? redditProfile.totalKarma -
        (redditProfile.baselineKarma ?? redditProfile.totalKarma)
      : 0;

    const withSafety = warmupMessages.filter((m) => m.generatedBody?.trim());
    const avgSafety =
      withSafety.length > 0
        ? withSafety.reduce((sum, m) => sum + m.safetyScore, 0) / withSafety.length
        : 10;

    const banRisk = Math.round((1 - avgSafety / 10) * 1000) / 1000;

    return {
      commentsToday,
      karmaGained: redditProfile ? karmaGained : 0,
      hasRedditProfile: Boolean(redditProfile?.profileUrl),
      banRisk,
    };
  }),

  getSuggestions: teamProcedure.query(async ({ ctx }) => {
    const filter = await ctx.db!.query.keywordFilters.findFirst({
      where: eq(keywordFilters.teamId, ctx.teamId),
    });

    const subreddits = filter?.subreddits?.length
      ? filter.subreddits
      : ["SaaS", "startups", "marketing"];

    const suggestions: Array<{
      redditId: string;
      title: string;
      subreddit: string;
      score: number;
      numComments: number;
      type: "post";
      preview: string;
    }> = [];

    for (const sub of subreddits.slice(0, 4)) {
      try {
        const posts = await fetchSubredditPosts(sub, 8, "hot");
        for (const post of posts) {
          suggestions.push({
            redditId: post.id,
            title: post.title,
            subreddit: post.subreddit,
            score: post.score,
            numComments: post.num_comments,
            type: "post",
            preview: (post.selftext || post.title).slice(0, 200),
          });
        }
      } catch {
        continue;
      }
    }

    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }),

  generateResponse: teamProcedure
    .input(
      z.object({
        postTitle: z.string().min(1),
        subreddit: z.string().min(1),
        postBody: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await generateWarmupReply(input);
      return {
        body: result.body,
        banRiskScore: result.banRiskScore,
      };
    }),
});
