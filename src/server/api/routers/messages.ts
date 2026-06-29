import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "@/server/api/trpc";
import { discoveredPosts, generatedMessages } from "@/server/db/schema";
import { buildRedditPostUrl } from "@/server/reddit/client";
import { fetchRedditUserProfile } from "@/server/reddit/user-profile";
import { fetchSubredditAbout } from "@/server/reddit/reddit-json";
import {
  computeStyleConfidence,
  getProjectIdForTeam,
  getSubredditVoice,
} from "@/server/reddit/subreddit-voice";
import {
  syncTeamSection,
  syncTeamPosts,
  regenerateMessage,
  generateMessageForPost,
} from "@/server/jobs/sync-section";

const messageTypeSchema = z.enum(["reply", "warmup", "influence", "post"]);
const sectionTabSchema = z.enum(["a_traiter", "traites"]);

async function voiceMetaForSubreddits(
  db: NonNullable<import("@/server/db").Database>,
  teamId: string,
  subredditNames: string[],
) {
  const projectId = await getProjectIdForTeam(db, teamId);
  const map = new Map<
    string,
    { styleConfidence: number; hasVoiceProfile: boolean }
  >();

  if (!projectId) {
    for (const s of subredditNames) {
      map.set(s.toLowerCase(), { styleConfidence: 1, hasVoiceProfile: false });
    }
    return map;
  }

  await Promise.all(
    subredditNames.map(async (raw) => {
      const sub = raw.replace(/^r\//i, "").toLowerCase();
      const voice = await getSubredditVoice(db, projectId, sub);
      if (!voice) {
        map.set(sub, { styleConfidence: 1, hasVoiceProfile: false });
      } else {
        map.set(sub, {
          styleConfidence: computeStyleConfidence(
            voice.voiceProfile,
            voice.sampleSize,
          ),
          hasVoiceProfile: true,
        });
      }
    }),
  );

  return map;
}

export const messagesRouter = createTRPCRouter({
  list: teamProcedure
    .input(
      z.object({
        type: messageTypeSchema,
        tab: sectionTabSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.type === "post") {
        return [];
      }

      const generated = await ctx.db!.query.generatedMessages.findMany({
        where: and(
          eq(generatedMessages.teamId, ctx.teamId),
          eq(generatedMessages.type, input.type),
        ),
      });
      const generatedMap = new Map<string, typeof generatedMessages.$inferSelect>();
      generated.forEach((msg) => generatedMap.set(msg.redditId, msg));

      if (input.tab === "traites") {
        const sentPosts = generated.filter((msg) => msg.isSent);
        const redditIds = sentPosts.map((m) => m.redditId);
        const discovered =
          redditIds.length > 0
            ? await ctx.db!.query.discoveredPosts.findMany({
                where: and(
                  eq(discoveredPosts.teamId, ctx.teamId),
                ),
              })
            : [];
        const postMap = new Map(discovered.map((p) => [p.redditId, p]));
        const voiceMap = await voiceMetaForSubreddits(
          ctx.db!,
          ctx.teamId,
          sentPosts.map((m) => m.subreddit),
        );

        return sentPosts
          .sort(
            (a, b) =>
              (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0),
          )
          .map((msg) => {
            const post = postMap.get(msg.redditId);
            const sub = msg.subreddit.replace(/^r\//i, "").toLowerCase();
            const voice = voiceMap.get(sub) ?? {
              styleConfidence: 1,
              hasVoiceProfile: false,
            };
            return {
              id: msg.id,
              type: msg.type,
              redditId: msg.redditId,
              subreddit: msg.subreddit,
              title: msg.title,
              author: msg.author ?? "unknown",
              permalink: buildRedditPostUrl(
                msg.subreddit,
                msg.redditId,
                msg.permalink,
              ),
              postBody: msg.postBody,
              generatedBody: msg.generatedBody,
              relevanceScore: post?.relevanceScore ?? 0,
              safetyScore: msg.safetyScore,
              banReason: msg.banReason,
              redditScore: msg.redditScore,
              isSent: msg.isSent,
              sentAt: msg.sentAt,
              createdAt: msg.createdAt,
              redditCreatedAt: msg.redditCreatedAt,
              styleConfidence: voice.styleConfidence,
              hasVoiceProfile: voice.hasVoiceProfile,
            };
          });
      }

      const posts = await ctx.db!.query.discoveredPosts.findMany({
        where: and(
          eq(discoveredPosts.teamId, ctx.teamId),
          eq(discoveredPosts.isArchived, false),
          eq(discoveredPosts.relevanceSection, input.type),
        ),
        orderBy: [
          desc(discoveredPosts.relevanceScore),
          desc(discoveredPosts.discoveredAt),
        ],
        limit: 100,
      });

      const filtered = posts.filter(
        (post) => !generatedMap.get(post.redditId)?.isSent,
      );
      const voiceMap = await voiceMetaForSubreddits(
        ctx.db!,
        ctx.teamId,
        filtered.map((p) => p.subreddit),
      );

      return filtered.map((post) => {
          const existing = generatedMap.get(post.redditId);
          const sub = post.subreddit.replace(/^r\//i, "").toLowerCase();
          const voice = voiceMap.get(sub) ?? {
            styleConfidence: 1,
            hasVoiceProfile: false,
          };
          return {
            id: existing?.id ?? post.id,
            type: input.type,
            redditId: post.redditId,
            subreddit: post.subreddit,
            title: post.title,
            author: post.author || "unknown",
            permalink: buildRedditPostUrl(
              post.subreddit,
              post.redditId,
              post.permalink,
            ),
            postBody: post.body,
            generatedBody: existing?.generatedBody ?? null,
            relevanceScore: post.relevanceScore ?? 0,
            safetyScore: existing?.safetyScore ?? null,
            banReason: existing?.banReason ?? post.relevanceReason,
            redditScore: post.score,
            isSent: existing?.isSent ?? false,
            sentAt: existing?.sentAt ?? null,
            createdAt: existing?.createdAt ?? post.discoveredAt,
            redditCreatedAt: post.discoveredAt,
            styleConfidence: voice.styleConfidence,
            hasVoiceProfile: voice.hasVoiceProfile,
          };
        });
    }),

  getAuthorProfile: teamProcedure
    .input(
      z.object({
        username: z.string().min(1).max(100),
        subreddit: z.string().min(1).max(100).optional(),
      }),
    )
    .query(async ({ input }) => {
      const author = input.username.replace(/^u\//i, "");
      const subreddit = input.subreddit?.replace(/^r\//i, "");

      const [redditProfile, subredditInfo] = await Promise.all([
        fetchRedditUserProfile(author),
        subreddit ? fetchSubredditAbout(subreddit) : Promise.resolve(null),
      ]);

      return {
        username: author,
        karma: redditProfile?.karma ?? null,
        accountAgeDays: redditProfile?.accountAgeDays ?? null,
        postCount: redditProfile?.postCount ?? redditProfile?.linkKarma ?? null,
        commentCount:
          redditProfile?.commentCount ?? redditProfile?.commentKarma ?? null,
        subreddit: subredditInfo
          ? {
              name: subredditInfo.name,
              members: subredditInfo.subscribers,
              postsPerDay: subredditInfo.postsPerDay,
              activeUsers: subredditInfo.activeUsers,
            }
          : null,
      };
    }),

  syncReply: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamSection(ctx.db!, ctx.teamId, "reply");
  }),

  syncWarmup: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamSection(ctx.db!, ctx.teamId, "warmup");
  }),

  syncInfluence: teamProcedure.mutation(async ({ ctx }) => {
    return syncTeamSection(ctx.db!, ctx.teamId, "influence");
  }),

  syncPosts: teamProcedure.mutation(async () => {
    return syncTeamPosts();
  }),

  generateForPost: teamProcedure
    .input(
      z.object({
        postRedditId: z.string(),
        type: messageTypeSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateMessageForPost(
          ctx.db!,
          ctx.teamId,
          input.postRedditId,
          input.type,
          ctx.session.user.id,
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Génération échouée",
        });
      }
    }),

  regenerate: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await regenerateMessage(
          ctx.db!,
          ctx.teamId,
          input.id,
          ctx.session.user.id,
        );
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Regénération échouée",
        });
      }
    }),

  toggleSent: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isSent: z.boolean(),
        redditId: z.string().optional(),
        type: messageTypeSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      let row = await ctx.db!.query.generatedMessages.findFirst({
        where: and(
          eq(generatedMessages.id, input.id),
          eq(generatedMessages.teamId, ctx.teamId),
        ),
      });

      if (!row && input.redditId && input.type) {
        const post = await ctx.db!.query.discoveredPosts.findFirst({
          where: and(
            eq(discoveredPosts.teamId, ctx.teamId),
            eq(discoveredPosts.redditId, input.redditId),
          ),
        });
        if (post) {
          const [created] = await ctx.db!
            .insert(generatedMessages)
            .values({
              teamId: ctx.teamId,
              type: input.type,
              redditId: post.redditId,
              subreddit: post.subreddit,
              title: post.title,
              author: post.author,
              permalink: buildRedditPostUrl(
                post.subreddit,
                post.redditId,
                post.permalink,
              ),
              postBody: post.body,
              generatedBody: "",
              isSent: input.isSent,
              sentAt: input.isSent ? new Date() : null,
              sentByUserId: input.isSent ? ctx.session.user.id : null,
            })
            .returning();
          row = created;
        }
      }

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
        .where(eq(generatedMessages.id, row.id));

      return { id: row.id, isSent: input.isSent };
    }),
});
