import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { users } from "@/server/db/schema";

export const userRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db!.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id),
    });
    return {
      id: ctx.session.user.id,
      name: user?.name ?? ctx.session.user.name,
      email: user?.email ?? ctx.session.user.email,
      image: user?.image ?? ctx.session.user.image,
      hasPassword: !!user?.passwordHash,
    };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(255),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db!.query.users.findFirst({
        where: eq(users.email, input.email),
      });
      if (existing && existing.id !== ctx.session.user.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Email déjà utilisé" });
      }

      await ctx.db!
        .update(users)
        .set({ name: input.name, email: input.email, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      return { ok: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8).max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db!.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (!user?.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Compte OAuth — mot de passe non applicable",
        });
      }

      const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Mot de passe actuel incorrect" });
      }

      const passwordHash = await bcrypt.hash(input.newPassword, 12);
      await ctx.db!
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id));

      return { ok: true };
    }),
});
