import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { sql } from "drizzle-orm";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.query(() => ({
    status: "ok" as const,
    timestamp: new Date(),
  })),

  db: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.db) {
      return { ok: false, message: "DATABASE_URL non configurée" };
    }
    try {
      await ctx.db.execute(sql`SELECT 1`);
      return { ok: true, message: "PostgreSQL connecté" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Erreur DB",
      };
    }
  }),

  integrations: publicProcedure.query(() => ({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    database: !!process.env.DATABASE_URL,
    google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
  })),
});
