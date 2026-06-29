import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Database } from "@/server/db";
import { teams, users } from "@/server/db/schema";
import type { PlanId } from "@/lib/plans";
import { getPlanMessageQuota } from "@/lib/plans";
import { MESSAGE_LIMIT_ERROR } from "@/lib/plan-errors";

export { MESSAGE_LIMIT_ERROR };

function isNewCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth();
}

export async function getTeamOwnerUser(db: Database, teamId: string) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return null;

  return db.query.users.findFirst({
    where: eq(users.id, team.ownerId),
  });
}

export async function ensureMonthlyReset(db: Database, userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  const now = new Date();
  const reference = user.messagesResetAt ?? user.planStartedAt ?? user.createdAt;
  if (!isNewCalendarMonth(now, reference)) {
    return user;
  }

  const [updated] = await db
    .update(users)
    .set({
      messagesUsed: 0,
      messagesResetAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning();

  return updated ?? user;
}

export async function getPlanUsage(db: Database, teamId: string) {
  const owner = await getTeamOwnerUser(db, teamId);
  if (!owner) {
    return {
      plan: "starter" as PlanId,
      messagesUsed: 0,
      messagesLimit: 200,
    };
  }

  const user = (await ensureMonthlyReset(db, owner.id)) ?? owner;
  const plan = (user.plan as PlanId | null) ?? "starter";
  const limit = user.messagesLimit ?? getPlanMessageQuota(plan);

  return {
    plan,
    messagesUsed: user.messagesUsed ?? 0,
    messagesLimit: limit,
  };
}

export async function assertMessageQuota(db: Database, teamId: string) {
  const owner = await getTeamOwnerUser(db, teamId);
  if (!owner) return;

  const user = (await ensureMonthlyReset(db, owner.id)) ?? owner;
  const limit = user.messagesLimit ?? 200;
  const used = user.messagesUsed ?? 0;

  if (used >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: MESSAGE_LIMIT_ERROR,
    });
  }
}

export async function incrementMessageUsage(db: Database, teamId: string) {
  const owner = await getTeamOwnerUser(db, teamId);
  if (!owner) return;

  const user = (await ensureMonthlyReset(db, owner.id)) ?? owner;

  await db
    .update(users)
    .set({
      messagesUsed: (user.messagesUsed ?? 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(users.id, owner.id));
}
