import { z } from "zod";
import { createTRPCRouter, publicProcedure, teamProcedure } from "@/server/api/trpc";
import { projectDrafts, projects } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

async function fetchSiteMetadata(url: string) {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    headers: { "User-Agent": "RedPulse/1.0 (+https://redpulse.app)" },
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Impossible d'accéder au site (${res.status})`);

  const html = await res.text();
  const pick = (pattern: RegExp) => html.match(pattern)?.[1]?.trim();

  const title =
    pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    pick(/<title[^>]*>([^<]+)<\/title>/i) ??
    new URL(normalized).hostname;

  const description =
    pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    "";

  return { title, description, url: normalized };
}

async function summarizeProduct(title: string, description: string, url: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return `${title} — ${description || "Produit SaaS promu via RedPulse."} (${url})`;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Analyse ce produit SaaS et rédige une description marketing concise (3-4 phrases, ton professionnel mais humain, en français) pour guider des réponses Reddit naturelles.

Titre: ${title}
Description site: ${description || "non disponible"}
URL: ${url}

Réponds uniquement avec la description, sans titre ni préambule.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    return `${title}. ${description}`.trim();
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  return (
    data.content.find((b) => b.type === "text")?.text?.trim() ??
    `${title}. ${description}`.trim()
  );
}

export const projectRouter = createTRPCRouter({
  analyzeSite: publicProcedure
    .input(z.object({ url: z.string().min(3).max(500) }))
    .mutation(async ({ input }) => {
      const meta = await fetchSiteMetadata(input.url);
      const suggestedDescription = await summarizeProduct(
        meta.title,
        meta.description,
        meta.url,
      );
      return {
        ...meta,
        suggestedDescription,
        keywords: extractKeywords(suggestedDescription),
      };
    }),

  enrichDescription: publicProcedure
    .input(
      z.object({
        description: z.string().min(10).max(2000),
        productName: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { description: input.description, suggestions: [] as string[] };
      }

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: `Optimise cette description produit pour Reddit marketing (naturel, pas spammy, français). Retourne JSON: {"description":"...","suggestions":["angle 1","angle 2","angle 3"]}

Produit: ${input.productName ?? "SaaS"}
Description actuelle: ${input.description}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        return { description: input.description, suggestions: [] as string[] };
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>;
      };
      const raw = data.content.find((b) => b.type === "text")?.text ?? "";
      try {
        const json = JSON.parse(raw) as {
          description: string;
          suggestions: string[];
        };
        return json;
      } catch {
        return { description: raw || input.description, suggestions: [] };
      }
    }),

  createDraft: publicProcedure
    .input(
      z.object({
        projectName: z.string().min(2).max(100),
        siteUrl: z.string().url(),
        description: z.string().max(2000).default(""),
        invites: z.array(z.string().email()).max(10).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const draftToken = crypto.randomUUID().replace(/-/g, "");
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);

      await ctx.db.insert(projectDrafts).values({
        draftToken,
        projectName: input.projectName,
        siteUrl: input.siteUrl,
        description: input.description || input.projectName,
        invites: input.invites,
        expiresAt: expires,
      });

      if (ctx.session?.user?.id) {
        const { getUserTeamContext, activateProjectDraft } = await import(
          "@/server/team/context"
        );
        const teamCtx = await getUserTeamContext(ctx.db, ctx.session.user.id);
        if (teamCtx) {
          await activateProjectDraft(
            ctx.db,
            ctx.session.user.id,
            teamCtx.teamId,
            draftToken,
          );
        }
      }

      return {
        draftToken,
        projectName: input.projectName,
        siteUrl: input.siteUrl,
        description: input.description,
        invites: input.invites,
        message: "Projet enregistré — créez votre compte pour l'activer.",
      };
    }),

  getCurrent: teamProcedure.query(async ({ ctx }) => {
    return ctx.db!.query.projects.findFirst({
      where: eq(projects.teamId, ctx.teamId),
    });
  }),
});

function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return [...new Set(words)].slice(0, 8);
}
