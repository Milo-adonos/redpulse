import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { generateRedditReply } from "@/server/ai/anthropic";

export const aiRouter = createTRPCRouter({
  generateReply: publicProcedure
    .input(
      z.object({
        postTitle: z.string().min(1).max(500),
        postBody: z.string().max(5000).optional(),
        subreddit: z.string().min(1).max(100),
        productContext: z.string().min(1).max(500),
        mentionProduct: z.boolean().default(true),
        tone: z.enum(["helpful", "casual", "technical"]).default("helpful"),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await generateRedditReply(input);
      return {
        body: result.body,
        banRiskScore: result.banRiskScore,
        model: result.model,
        needsReview: result.banRiskScore > 0.6,
      };
    }),

  testConnection: publicProcedure.query(async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { ok: false, message: "Clé API manquante" };
    }

    try {
      const result = await generateRedditReply({
        postTitle: "What tools do you use for Reddit marketing?",
        subreddit: "SaaS",
        productContext: "RedPulse — automation Reddit",
        mentionProduct: false,
        tone: "helpful",
      });
      return { ok: true, sample: result.body.slice(0, 80) + "..." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }),
});
