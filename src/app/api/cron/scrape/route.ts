import { db } from "@/server/db";
import { runAllTeamsSync, runFullTeamSync } from "@/server/jobs/sync-team";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  const results = teamId
    ? [await runFullTeamSync(db, teamId)]
    : await runAllTeamsSync(db);

  return NextResponse.json({
    ok: true,
    teams: results.length,
    results,
    at: new Date().toISOString(),
  });
}
