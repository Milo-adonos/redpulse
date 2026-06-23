import { z } from "zod";
import { and, desc, eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import {
  accounts,
  analyticsEvents,
  comments,
  directMessages,
  discoveredPosts,
  projects,
} from "@/server/db/schema";
import { generateRedditReply } from "@/server/ai/anthropic";
import { decryptSecret, encryptSecret, hasEncryptionKey } from "@/server/crypto";
import { refreshUserToken, sendRedditDM } from "@/server/reddit/client";
import { checkRateLimit } from "@/server/rate-limit";

export const dmRouter = createTRPCRouter({
  list: teamProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db!.query.directMessages.findMany({
      where: and(
        eq(directMessages.teamId, ctx.teamId),
        or(
          eq(directMessages.status, "draft"),
          eq(directMessages.status, "pending_review"),
        ),
      ),
      orderBy: [desc(directMessages.createdAt)],
      limit: 50,
      with: {
        discoveredPost: true,
      },
    });

    return rows.map((dm) => ({
      id: dm.id,
      title: dm.subject,
      subtitle: `u/${dm.recipientUsername}`,
      meta: `${dm.status} · ${dm.sentAt ? "envoyé" : "brouillon"}`,
      badge: dm.status === "sent" ? "sent" : "dm",
      preview: dm.body.slice(0, 200),
      body: dm.body,
      status: dm.status,
      recipientUsername: dm.recipientUsername,
      subreddit: dm.discoveredPost?.subreddit ?? "",
      postTitle: dm.discoveredPost?.title ?? dm.subject,
      permalink: dm.discoveredPost?.permalink ?? "",
      author: dm.recipientUsername,
    }));
  }),

  compose: teamProcedure
    .input(
      z.object({
        discoveredPostId: z.string().uuid(),
        recipientUsername: z.string().min(2).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db!.query.discoveredPosts.findFirst({
        where: and(
          eq(discoveredPosts.id, input.discoveredPostId),
          eq(discoveredPosts.teamId, ctx.teamId),
        ),
      });

      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const project = await ctx.db!.query.projects.findFirst({
        where: eq(projects.teamId, ctx.teamId),
      });

      const result = await generateRedditReply({
        postTitle: post.title,
        postBody: post.body ?? undefined,
        subreddit: post.subreddit,
        productContext: project?.description ?? project?.name ?? "notre produit",
        productName: project?.name ?? undefined,
        siteUrl: project?.siteUrl ?? undefined,
        mentionProduct: true,
        tone: "casual",
      });

      const recipient = input.recipientUsername ?? post.author ?? "reddit_user";
      const subject = `Re: ${post.title.slice(0, 80)}`;
      const dmBody = `hey j'ai vu ton post sur r/${post.subreddit} — ${result.body}`;

      const [row] = await ctx.db!
        .insert(directMessages)
        .values({
          teamId: ctx.teamId,
          userId: ctx.session.user.id,
          discoveredPostId: post.id,
          recipientUsername: recipient.replace(/^u\//, ""),
          subject,
          body: dmBody.slice(0, 2000),
          status: "pending_review",
        })
        .returning();

      return { id: row!.id, body: row!.body, subject: row!.subject };
    }),

  send: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const dm = await ctx.db!.query.directMessages.findFirst({
        where: and(
          eq(directMessages.id, input.id),
          eq(directMessages.teamId, ctx.teamId),
        ),
      });

      if (!dm) throw new TRPCError({ code: "NOT_FOUND" });

      const rate = await checkRateLimit(ctx.db!, ctx.teamId, "dm", 5);
      if (!rate.allowed) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Limite DM horaire atteinte",
        });
      }

      const redditAccount = await ctx.db!.query.accounts.findFirst({
        where: and(
          eq(accounts.userId, ctx.session.user.id),
          eq(accounts.provider, "reddit"),
        ),
      });

      if (!redditAccount?.redditRefreshToken || !hasEncryptionKey()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Connectez Reddit dans Paramètres",
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
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Token Reddit expiré" });
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

      await sendRedditDM(
        accessToken!,
        dm.recipientUsername,
        dm.subject,
        dm.body,
      );

      await ctx.db!
        .update(directMessages)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(directMessages.id, dm.id));

      await ctx.db!.insert(analyticsEvents).values({
        teamId: ctx.teamId,
        entityType: "dm",
        entityId: dm.id,
        eventType: "dm",
        value: 1,
      });

      return { ok: true };
    }),
});
