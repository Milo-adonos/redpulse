import { z } from "zod";
import { createTRPCRouter, publicProcedure, teamProcedure } from "@/server/api/trpc";
import { projectDrafts, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  analyzeProductFromSite,
  extractKeywords,
} from "@/server/project/site-analysis";
import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_MESSAGE } from "@/server/ai/constants";

function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("URL du site requise");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  new URL(withProtocol);
  return withProtocol;
}

function parseInviteEmails(raw: string[] | undefined): string[] {
  return [...new Set((raw ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean))].filter(
    (email) => z.string().email().safeParse(email).success,
  );
}

export const projectRouter = createTRPCRouter({
  analyzeSite: publicProcedure
    .input(z.object({ url: z.string().min(3).max(500) }))
    .mutation(async ({ input }) => {
      return analyzeProductFromSite(input.url);
    }),

  enrichDescription: publicProcedure
    .input(
      z.object({
        description: z.string().min(10).max(4000),
        productName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const text = await callAnthropic({
          max_tokens: MAX_TOKENS_MESSAGE,
          messages: [
            {
              role: "user",
              content: `Improve this SaaS product brief for Reddit marketing AI (English, detailed, natural). Return JSON: {"description":"...","suggestions":["angle 1","angle 2","angle 3"]}

Product: ${input.productName ?? "SaaS"}
Current brief: ${input.description}`,
            },
          ],
        });

        return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as {
          description: string;
          suggestions: string[];
        };
      } catch {
        return { description: input.description, suggestions: [] as string[] };
      }
    }),

  createDraft: publicProcedure
    .input(
      z.object({
        projectName: z.string().min(2).max(100),
        siteUrl: z.string().min(3).max(500),
        description: z.string().max(4000).default(""),
        productPrompt: z.string().max(8000).optional(),
        keywords: z.array(z.string()).max(30).default([]),
        subreddits: z.array(z.string()).max(10).default([]),
        invites: z.array(z.string()).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      let siteUrl: string;
      try {
        siteUrl = normalizeSiteUrl(input.siteUrl);
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "URL du site invalide — vérifiez le format (ex. https://votre-site.com)",
        });
      }

      const draftToken = crypto.randomUUID().replace(/-/g, "");
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      const keywords =
        input.keywords.length > 0
          ? input.keywords
          : extractKeywords(input.description || input.projectName);
      const subreddits = input.subreddits.map((s) => s.replace(/^r\//i, ""));
      const invites = parseInviteEmails(input.invites);

      await ctx.db.insert(projectDrafts).values({
        draftToken,
        projectName: input.projectName,
        siteUrl,
        description: input.description || input.projectName,
        productPrompt:
          input.productPrompt ?? (input.description || input.projectName),
        keywords,
        subreddits,
        invites,
        expiresAt: expires,
      });

      return {
        draftToken,
        projectName: input.projectName,
        siteUrl,
        description: input.description,
        keywords,
        subreddits,
        invites,
        message: "Projet enregistré — créez votre compte pour l'activer.",
      };
    }),

  getCurrent: teamProcedure.query(async ({ ctx }) => {
    return ctx.db!.query.projects.findFirst({
      where: eq(projects.teamId, ctx.teamId),
    });
  }),
});
