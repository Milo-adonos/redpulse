import { z } from "zod";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  users,
  teams,
  teamMembers,
  keywordFilters,
  teamSettings,
  projectDrafts,
} from "@/server/db/schema";
import { slugify } from "@/lib/utils";
import { activateProjectDraft, claimPendingInvitesForEmail } from "@/server/team/context";
import { runFullTeamSync } from "@/server/jobs/sync-team";

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email(),
        password: z.string().min(8).max(128),
        draftToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de données non connectée",
        });
      }

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cet email est déjà utilisé",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const teamSlug =
        slugify(`${input.name}-team`) + "-" + Date.now().toString(36);

      let teamName = `Équipe ${input.name}`;
      if (input.draftToken) {
        const draft = await ctx.db.query.projectDrafts.findFirst({
          where: and(
            eq(projectDrafts.draftToken, input.draftToken),
            gt(projectDrafts.expiresAt, new Date()),
          ),
        });
        if (draft) teamName = draft.projectName;
      }

      const [user] = await ctx.db
        .insert(users)
        .values({
          email: input.email,
          name: input.name,
          passwordHash,
        })
        .returning();

      const [team] = await ctx.db
        .insert(teams)
        .values({
          name: teamName,
          slug: teamSlug,
          ownerId: user!.id,
        })
        .returning();

      await ctx.db.insert(teamMembers).values({
        teamId: team!.id,
        userId: user!.id,
        role: "owner",
      });

      await ctx.db.insert(teamSettings).values({ teamId: team!.id });

      await claimPendingInvitesForEmail(ctx.db, user!.id, input.email);

      if (input.draftToken) {
        await activateProjectDraft(
          ctx.db,
          user!.id,
          team!.id,
          input.draftToken,
        );
        runFullTeamSync(ctx.db, team!.id, user!.id).catch(() => {});
      } else {
        await ctx.db.insert(keywordFilters).values({
          teamId: team!.id,
          keywords: ["saas", "marketing", "growth", "startup", "automation"],
          subreddits: ["SaaS", "startups", "marketing", "entrepreneur"],
          isActive: true,
        });
      }

      return {
        userId: user!.id,
        teamId: team!.id,
        email: user!.email,
      };
    }),
});
