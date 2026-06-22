import { z } from "zod";
import { eq } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import { keywordFilters } from "@/server/db/schema";
import { fetchSubredditPosts } from "@/server/reddit/client";
import { generateWarmupReply } from "@/server/ai/anthropic";

export const warmupRouter = createTRPCRouter({
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
