import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import { discoveredPosts } from "@/server/db/schema";
import { buildRedditPostUrl } from "@/server/reddit/client";

export const discoveryRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          tab: z.enum(["all", "match", "pending"]).default("all"),
          includeArchived: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(discoveredPosts.teamId, ctx.teamId)];

      if (!input?.includeArchived) {
        conditions.push(eq(discoveredPosts.isArchived, false));
      }

      if (input?.search) {
        const q = `%${input.search}%`;
        conditions.push(
          or(
            ilike(discoveredPosts.title, q),
            ilike(discoveredPosts.subreddit, q),
          )!,
        );
      }

      if (input?.tab === "match") {
        conditions.push(sqlIntentGte(0.5));
      } else if (input?.tab === "pending") {
        conditions.push(
          sql`(${discoveredPosts.intentScore} IS NULL OR ${discoveredPosts.intentScore}::float < 0.5)`,
        );
      }

      const rows = await ctx.db!.query.discoveredPosts.findMany({
        where: and(...conditions),
        orderBy: [desc(discoveredPosts.intentScore), desc(discoveredPosts.discoveredAt)],
        limit: 100,
      });

      return rows.map(formatPost);
    }),

  getById: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db!.query.discoveredPosts.findFirst({
        where: and(
          eq(discoveredPosts.id, input.id),
          eq(discoveredPosts.teamId, ctx.teamId),
        ),
      });
      if (!post) return null;
      return formatPost(post);
    }),

  archive: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db!
        .update(discoveredPosts)
        .set({ isArchived: true })
        .where(
          and(
            eq(discoveredPosts.id, input.id),
            eq(discoveredPosts.teamId, ctx.teamId),
          ),
        );
      return { ok: true };
    }),
});

function sqlIntentGte(min: number) {
  return sql`${discoveredPosts.intentScore}::float >= ${min}`;
}

function formatPost(post: typeof discoveredPosts.$inferSelect) {
  const minutesAgo = Math.max(
    1,
    Math.round((Date.now() - post.discoveredAt.getTime()) / 60000),
  );
  return {
    id: post.id,
    title: post.title,
    subtitle: `r/${post.subreddit}`,
    meta: `Score ${post.score ?? 0} · il y a ${minutesAgo} min`,
    badge:
      Number(post.intentScore ?? 0) >= 0.7
        ? "hot"
        : Number(post.intentScore ?? 0) >= 0.5
          ? "match"
          : undefined,
    preview: post.body?.slice(0, 280) ?? post.title,
    redditId: post.redditId,
    permalink: buildRedditPostUrl(
      post.subreddit,
      post.redditId,
      post.permalink,
    ),
    intentScore: Number(post.intentScore ?? 0),
    body: post.body,
  };
}
