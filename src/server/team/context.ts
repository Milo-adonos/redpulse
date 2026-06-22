import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "@/server/db";
import { teamInvites, teamMembers, teams, users } from "@/server/db/schema";
import type { roleEnum } from "@/server/db/schema";
import { extractKeywords } from "@/server/project/site-analysis";
import { inferSubredditsFromText } from "@/server/reddit/subreddit-discovery";

type Role = (typeof roleEnum.enumValues)[number];

export async function getUserTeamContext(
  db: Database,
  userId: string,
  preferredTeamId?: string | null,
): Promise<{ teamId: string; role: Role } | null> {
  if (preferredTeamId) {
    const preferred = await db.query.teamMembers.findFirst({
      where: and(
        eq(teamMembers.teamId, preferredTeamId),
        eq(teamMembers.userId, userId),
      ),
    });
    if (preferred) {
      return { teamId: preferred.teamId, role: preferred.role };
    }
  }

  const memberships = await db.query.teamMembers.findMany({
    where: eq(teamMembers.userId, userId),
    with: { team: true },
  });

  if (!memberships.length) return null;

  const rolePriority: Record<Role, number> = {
    owner: 4,
    admin: 3,
    editor: 2,
    viewer: 1,
  };

  const owned = memberships.filter((m) => m.role === "owner");
  const pool = owned.length ? owned : memberships;

  const best = pool.sort((a, b) => {
    const roleDiff = rolePriority[b.role] - rolePriority[a.role];
    if (roleDiff !== 0) return roleDiff;
    return b.team.createdAt.getTime() - a.team.createdAt.getTime();
  })[0]!;

  return { teamId: best.teamId, role: best.role };
}

export async function activateProjectDraft(
  db: Database,
  userId: string,
  teamId: string,
  draftToken: string,
) {
  const { projectDrafts, projects, teamSettings, keywordFilters } =
    await import("@/server/db/schema");
  const { and, eq, gt } = await import("drizzle-orm");

  const draft = await db.query.projectDrafts.findFirst({
    where: and(
      eq(projectDrafts.draftToken, draftToken),
      gt(projectDrafts.expiresAt, new Date()),
    ),
  });

  if (!draft) return null;

  const owner = await db.query.teamMembers.findFirst({
    where: and(eq(teamMembers.teamId, teamId), eq(teamMembers.role, "owner")),
  });

  if (!owner || owner.userId !== userId) {
    return null;
  }

  const keywords =
    draft.keywords?.length ? draft.keywords : extractKeywords(draft.description);
  const subreddits = draft.subreddits?.length
    ? draft.subreddits.map((s) => s.replace(/^r\//i, ""))
    : inferSubredditsFromText(
        `${draft.projectName} ${draft.description}`,
        10,
      );

  await db
    .insert(projects)
    .values({
      teamId,
      name: draft.projectName,
      siteUrl: draft.siteUrl,
      description: draft.description,
      keywords,
    })
    .onConflictDoUpdate({
      target: projects.teamId,
      set: {
        name: draft.projectName,
        siteUrl: draft.siteUrl,
        description: draft.description,
        keywords,
        updatedAt: new Date(),
      },
    });

  await db
    .update(teams)
    .set({ name: draft.projectName, updatedAt: new Date() })
    .where(eq(teams.id, teamId));

  await db.insert(teamSettings).values({ teamId }).onConflictDoNothing();

  const existingFilter = await db.query.keywordFilters.findFirst({
    where: eq(keywordFilters.teamId, teamId),
  });

  if (existingFilter) {
    await db
      .update(keywordFilters)
      .set({ keywords, subreddits, isActive: true })
      .where(eq(keywordFilters.id, existingFilter.id));
  } else {
    await db.insert(keywordFilters).values({
      teamId,
      keywords,
      subreddits,
      isActive: true,
    });
  }

  for (const email of draft.invites ?? []) {
    await processTeamInvite(db, teamId, email, userId, "viewer");
  }

  await db.delete(projectDrafts).where(eq(projectDrafts.id, draft.id));
  return { ...draft, teamId };
}

export async function processTeamInvite(
  db: Database,
  teamId: string,
  email: string,
  invitedBy: string,
  role: Role = "viewer",
): Promise<{ status: "active" | "pending"; email: string }> {
  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existingUser) {
    await db
      .insert(teamMembers)
      .values({
        teamId,
        userId: existingUser.id,
        role,
      })
      .onConflictDoNothing();
    return { status: "active", email: normalizedEmail };
  }

  const pending = await db.query.teamInvites.findFirst({
    where: and(
      eq(teamInvites.teamId, teamId),
      eq(teamInvites.email, normalizedEmail),
      isNull(teamInvites.acceptedAt),
    ),
  });

  if (!pending) {
    const token = crypto.randomUUID().replace(/-/g, "");
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10);
    await db.insert(teamInvites).values({
      teamId,
      email: normalizedEmail,
      role,
      token,
      invitedBy,
      expiresAt: expires,
    });
  }

  return { status: "pending", email: normalizedEmail };
}

export async function claimPendingInvitesForEmail(
  db: Database,
  userId: string,
  email: string,
) {
  const normalizedEmail = email.toLowerCase().trim();
  const invites = await db.query.teamInvites.findMany({
    where: and(
      eq(teamInvites.email, normalizedEmail),
      isNull(teamInvites.acceptedAt),
    ),
  });

  for (const invite of invites) {
    await db
      .insert(teamMembers)
      .values({
        teamId: invite.teamId,
        userId,
        role: invite.role,
      })
      .onConflictDoNothing();

    await db
      .update(teamInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(teamInvites.id, invite.id));
  }

  return invites.length;
}
