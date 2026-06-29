import type { Database } from "@/server/db";
import { teamSettings, teams } from "@/server/db/schema";
import {
  syncTeamSection,
  syncTeamPosts,
} from "@/server/jobs/sync-section";

async function touchTeamSync(db: Database, teamId: string) {
  await db
    .insert(teamSettings)
    .values({ teamId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: teamSettings.teamId,
      set: { updatedAt: new Date() },
    });
}

export async function runFullTeamSync(
  db: Database,
  teamId: string,
) {
  let redditError: string | undefined;

  const warmup = await syncTeamSection(db, teamId, "warmup").catch(
    (error) => {
      const msg = error instanceof Error ? error.message : "Erreur sync warmup";
      redditError = msg;
      return { created: 0, eligible: 0, minScore: 40, scraped: 0, error: msg };
    },
  );

  const replies = await syncTeamSection(db, teamId, "reply").catch(
    (error) => {
      redditError =
        redditError ??
        (error instanceof Error ? error.message : "Erreur sync reply");
      return { created: 0, eligible: 0, minScore: 80, scraped: 0, error: redditError };
    },
  );

  const influence = await syncTeamSection(db, teamId, "influence").catch((error) => {
    const msg = error instanceof Error ? error.message : "Erreur sync influence";
    redditError = redditError ?? msg;
    return { created: 0, eligible: 0, minScore: 65, scraped: 0, error: msg };
  });

  const posts = await syncTeamPosts().catch((error) => {
    const msg = error instanceof Error ? error.message : "Erreur sync posts";
    redditError = redditError ?? msg;
    return { created: 0, error: msg };
  });

  await touchTeamSync(db, teamId);

  return { teamId, replies, warmup, influence, posts, redditError };
}

export async function runAllTeamsSync(db: Database) {
  const allTeams = await db.select({ id: teams.id }).from(teams);
  const results = [];

  for (const team of allTeams) {
    try {
      const result = await runFullTeamSync(db, team.id);
      results.push(result);
    } catch (error) {
      results.push({
        teamId: team.id,
        error: error instanceof Error ? error.message : "sync failed",
      });
    }
  }

  return results;
}

// Legacy exports
export async function syncTeamReplies(
  db: Database,
  teamId: string,
) {
  return syncTeamSection(db, teamId, "reply");
}

export async function syncTeamWarmup(
  db: Database,
  teamId: string,
) {
  return syncTeamSection(db, teamId, "warmup");
}
