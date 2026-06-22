import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError, z } from "zod";
import { auth } from "@/server/auth";
import { teamMembers } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { roleEnum } from "@/server/db/schema";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  return { session, db: (await import("@/server/db")).db, headers: opts.headers };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

type Role = (typeof roleEnum.enumValues)[number];

const roleHierarchy: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function createTeamProcedure(minRole: Role = "viewer") {
  return protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .use(async ({ ctx, input, next }) => {
      if (!ctx.db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not configured",
        });
      }

      const membership = await ctx.db.query.teamMembers.findFirst({
        where: and(
          eq(teamMembers.teamId, input.teamId),
          eq(teamMembers.userId, ctx.session.user.id),
        ),
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (roleHierarchy[membership.role] < roleHierarchy[minRole]) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return next({
        ctx: {
          ...ctx,
          teamId: input.teamId,
          role: membership.role,
        },
      });
    });
}

export const teamProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not configured",
    });
  }

  const { getUserTeamContext } = await import("@/server/team/context");
  const teamCtx = await getUserTeamContext(ctx.db, ctx.session.user.id);

  if (!teamCtx) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Aucune équipe associée",
    });
  }

  return next({
    ctx: {
      ...ctx,
      teamId: teamCtx.teamId,
      role: teamCtx.role,
    },
  });
});
