import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  accounts,
  analyticsEvents,
  comments,
  discoveredPosts,
  projects,
  teamSettings,
} from "@/server/db/schema";
import { generateRedditReply } from "@/server/ai/anthropic";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "@/server/crypto";
import {
  postRedditComment,
  refreshUserToken,
} from "@/server/reddit/client";
import { checkRateLimit } from "@/server/rate-limit";

export const commentsRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending_review", "sent", "draft", "all"])
            .default("pending_review"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(comments.teamId, ctx.teamId)];
      if (input?.status && input.status !== "all") {
        conditions.push(eq(comments.status, input.status));
      }

      const rows = await ctx.db!.query.comments.findMany({
        where: and(...conditions),
        orderBy: [desc(comments.createdAt)],
        limit: 50,
        with: {
          discoveredPost: true,
        },
      });

      return rows.map((c) => ({
        id: c.id,
        title: c.discoveredPost?.title ?? "Réponse libre",
        subtitle: c.discoveredPost
          ? `r/${c.discoveredPost.subreddit} · ${c.status}`
          : c.status,
        meta: `Ban risk ${c.banRiskScore ?? "—"} · ${formatRelative(c.createdAt)}`,
        badge: c.status === "pending_review" ? "review" : c.status,
        preview: c.body.slice(0, 280),
        body: c.body,
        status: c.status,
        discoveredPostId: c.discoveredPostId,
        banRiskScore: c.banRiskScore ? Number(c.banRiskScore) : null,
      }));
    }),

  getEditorContext: teamProcedure
    .input(z.object({ discoveredPostId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const [project, post] = await Promise.all([
        ctx.db!.query.projects.findFirst({
          where: eq(projects.teamId, ctx.teamId),
        }),
        input.discoveredPostId
          ? ctx.db!.query.discoveredPosts.findFirst({
              where: and(
                eq(discoveredPosts.id, input.discoveredPostId),
                eq(discoveredPosts.teamId, ctx.teamId),
              ),
            })
          : null,
      ]);

      return {
        productContext: project?.description ?? "Mon produit SaaS",
        productName: project?.name ?? "Mon projet",
        post: post
          ? {
              id: post.id,
              title: post.title,
              body: post.body,
              subreddit: post.subreddit,
              redditId: post.redditId,
            }
          : null,
      };
    }),

  createDraft: teamProcedure
    .input(
      z.object({
        discoveredPostId: z.string().uuid().optional(),
        body: z.string().min(1).max(10000),
        banRiskScore: z.number().optional(),
        aiModel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db!
        .insert(comments)
        .values({
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
          discoveredPostId: input.discoveredPostId,
          body: input.body,
          status: "pending_review",
          banRiskScore:
            input.banRiskScore != null ? String(input.banRiskScore) : null,
          aiModel: input.aiModel,
        })
        .returning();
      return { id: row!.id, body: row!.body, status: row!.status };
    }),

  generateAndDraft: teamProcedure
    .input(
      z.object({
        discoveredPostId: z.string().uuid().optional(),
        postTitle: z.string().min(1),
        postBody: z.string().optional(),
        subreddit: z.string().min(1),
        mentionProduct: z.boolean().default(true),
        tone: z.enum(["helpful", "casual", "technical"]).default("helpful"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      });

      const result = await generateRedditReply({
        postTitle: input.postTitle,
        postBody: input.postBody,
        subreddit: input.subreddit,
        productContext: project?.description ?? "Mon produit",
        mentionProduct: input.mentionProduct,
        tone: input.tone,
      });

      const settings = await getTeamSettings(ctx.db!, ctx.teamId);
      const needsReview =
        result.banRiskScore > Number(settings.maxBanRisk ?? 0.6);

      const [row] = await ctx.db!
        .insert(comments)
        .values({
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
          discoveredPostId: input.discoveredPostId,
          body: result.body,
          status: needsReview ? "pending_review" : "pending_review",
          banRiskScore: String(result.banRiskScore),
          aiModel: result.model,
          productMention: input.mentionProduct,
        })
        .returning();

      return {
        id: row!.id,
        body: result.body,
        banRiskScore: result.banRiskScore,
        needsReview,
      };
    }),

  approveAndSend: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const comment = await ctx.db!.query.comments.findFirst({
        where: and(eq(comments.id, input.id), eq(comments.teamId, ctx.teamId)),
        with: { discoveredPost: true },
      });

      if (!comment) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const settings = await getTeamSettings(ctx.db!, ctx.teamId);
      if (comment.body.length > settings.charLimit) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Réponse trop longue (max ${settings.charLimit} caractères)`,
        });
      }

      const rate = await checkRateLimit(
        ctx.db!,
        ctx.teamId,
        "reply",
        settings.repliesPerHour,
      );
      if (!rate.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Limite horaire atteinte — Reddit vous remercie de patienter.",
        });
      }

      const redditAccount = await ctx.db!.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, ctx.session.user.id),
          eq(accounts.provider, "reddit"),
        ),
      });

      if (!redditAccount?.redditRefreshToken) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connectez un compte Reddit dans Paramètres",
        });
      }

      if (!hasEncryptionKey()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "ENCRYPTION_KEY non configurée",
        });
      }

      let accessToken = redditAccount.redditAccessToken
        ? decryptSecret(redditAccount.redditAccessToken)
        : null;

      if (
        !redditAccount.redditTokenExpiresAt ||
        redditAccount.redditTokenExpiresAt < new Date()
      ) {
        const refreshed = await refreshUserToken(
          decryptSecret(redditAccount.redditRefreshToken),
        );
        if (!refreshed) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Token Reddit expiré — reconnectez votre compte",
          });
        }
        accessToken = refreshed.accessToken;
        await ctx.db!
          .update(accounts)
          .set({
            redditAccessToken: encryptSecret(refreshed.accessToken),
            redditRefreshToken: encryptSecret(refreshed.refreshToken),
            redditTokenExpiresAt: new Date(
              Date.now() + refreshed.expiresIn * 1000,
            ),
          })
          .where(eq(accounts.id, redditAccount.id));
      }

      const redditId = comment.discoveredPost?.redditId;
      if (!redditId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Post Reddit source introuvable",
        });
      }

      const published = await postRedditComment(
        accessToken!,
        redditId,
        comment.body,
      );

      await ctx.db!
        .update(comments)
        .set({
          status: "sent",
          sentAt: new Date(),
          redditCommentId: published.id,
        })
        .where(eq(comments.id, comment.id));

      await ctx.db!.insert(analyticsEvents).values({
        teamId: ctx.teamId,
        entityType: "comment",
        entityId: comment.id,
        eventType: "sent",
        value: 1,
      });

      return {
        redditCommentId: published.id,
        permalink: `https://reddit.com${published.permalink}`,
      };
    }),
});

async function getTeamSettings(db: NonNullable<import("@/server/db").Database>, teamId: string) {
  const settings = await db.query.teamSettings.findFirst({
    where: eq(teamSettings.teamId, teamId),
  });
  return (
    settings ?? {
      repliesPerHour: 10,
      charLimit: 400,
      maxBanRisk: "0.60",
    }
  );
}

function formatRelative(date: Date) {
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  return `il y a ${hours}h`;
}
