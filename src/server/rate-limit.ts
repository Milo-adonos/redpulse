import { and, eq, gte } from "drizzle-orm";
import type { Database } from "@/server/db";
import { rateLimitLogs } from "@/server/db/schema";

export async function checkRateLimit(
  db: Database,
  teamId: string,
  action: string,
  maxPerHour: number,
): Promise<{ allowed: boolean; count: number }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  const existing = await db.query.rateLimitLogs.findFirst({
    where: and(
      eq(rateLimitLogs.teamId, teamId),
      eq(rateLimitLogs.action, action),
      gte(rateLimitLogs.windowStart, windowStart),
    ),
  });

  const count = existing?.count ?? 0;
  if (count >= maxPerHour) {
    return { allowed: false, count };
  }

  if (existing) {
    await db
      .update(rateLimitLogs)
      .set({ count: count + 1 })
      .where(eq(rateLimitLogs.id, existing.id));
  } else {
    await db.insert(rateLimitLogs).values({
      teamId,
      action,
      count: 1,
      windowStart,
    });
  }

  return { allowed: true, count: count + 1 };
}
