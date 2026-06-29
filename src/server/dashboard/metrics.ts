import { and, desc, eq, lt } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  generatedMessages,
  redditKarmaSnapshots,
  teamRedditProfiles,
} from "@/server/db/schema";
import { persistTeamRedditProfile } from "@/server/reddit/reddit-account";

const SECTIONS = ["reply", "warmup", "influence"] as const;

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function twoWeeksAgo() {
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function formatAccountAge(days: number | null): string {
  if (days == null) return "—";
  if (days < 30) return `${days} j`;
  if (days < 365) return `${Math.floor(days / 30)} mois`;
  const years = Math.floor(days / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}

export async function buildDashboardData(db: Database, teamId: string) {
  const [messages, redditProfile, karmaSnapshotWeekAgo, karmaSnapshotTwoWeeksAgo] =
    await Promise.all([
      db.query.generatedMessages.findMany({
        where: eq(generatedMessages.teamId, teamId),
        orderBy: [desc(generatedMessages.sentAt), desc(generatedMessages.createdAt)],
      }),
      db.query.teamRedditProfiles.findFirst({
        where: eq(teamRedditProfiles.teamId, teamId),
      }),
      db.query.redditKarmaSnapshots.findFirst({
        where: and(
          eq(redditKarmaSnapshots.teamId, teamId),
          lt(redditKarmaSnapshots.recordedAt, weekAgo()),
        ),
        orderBy: [desc(redditKarmaSnapshots.recordedAt)],
      }),
      db.query.redditKarmaSnapshots.findFirst({
        where: and(
          eq(redditKarmaSnapshots.teamId, teamId),
          lt(redditKarmaSnapshots.recordedAt, twoWeeksAgo()),
        ),
        orderBy: [desc(redditKarmaSnapshots.recordedAt)],
      }),
    ]);

  const sectionMessages = messages.filter((m) =>
    SECTIONS.includes(m.type as (typeof SECTIONS)[number]),
  );
  const sent = sectionMessages.filter((m) => m.isSent);
  const generatedCount = sectionMessages.length;
  const sentCount = sent.length;

  const sectionGenerated = {
    reply: sectionMessages.filter((m) => m.type === "reply").length,
    warmup: sectionMessages.filter((m) => m.type === "warmup").length,
    influence: sectionMessages.filter((m) => m.type === "influence").length,
  };

  const sentThisWeek = sent.filter(
    (m) => m.sentAt && m.sentAt >= weekAgo(),
  ).length;
  const sentLastWeek = sent.filter(
    (m) =>
      m.sentAt &&
      m.sentAt >= twoWeeksAgo() &&
      m.sentAt < weekAgo(),
  ).length;

  const sentBySection = {
    reply: sent.filter((m) => m.type === "reply").length,
    warmup: sent.filter((m) => m.type === "warmup").length,
    influence: sent.filter((m) => m.type === "influence").length,
  };

  const subsThisWeek = new Set(
    sent
      .filter((m) => m.sentAt && m.sentAt >= weekAgo())
      .map((m) => m.subreddit.toLowerCase()),
  ).size;
  const subsLastWeek = new Set(
    sent
      .filter(
        (m) =>
          m.sentAt &&
          m.sentAt >= twoWeeksAgo() &&
          m.sentAt < weekAgo(),
      )
      .map((m) => m.subreddit.toLowerCase()),
  ).size;

  const sentSubredditCounts = new Map<string, number>();
  for (const msg of sent) {
    sentSubredditCounts.set(
      msg.subreddit,
      (sentSubredditCounts.get(msg.subreddit) ?? 0) + 1,
    );
  }

  const activeSubredditEntries = [...sentSubredditCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  );
  const topSentSubreddit = activeSubredditEntries[0]?.[0] ?? null;

  const avgBanScore =
    sectionMessages.length > 0
      ? avg(sectionMessages.map((m) => m.safetyScore ?? 0))
      : 0;

  const banThisWeek = sent.filter((m) => m.sentAt && m.sentAt >= weekAgo());
  const banLastWeek = sent.filter(
    (m) =>
      m.sentAt &&
      m.sentAt >= twoWeeksAgo() &&
      m.sentAt < weekAgo(),
  );
  const avgBanThisWeek = banThisWeek.length
    ? avg(banThisWeek.map((m) => m.safetyScore ?? 0))
    : 0;
  const avgBanLastWeek = banLastWeek.length
    ? avg(banLastWeek.map((m) => m.safetyScore ?? 0))
    : 0;

  const sendRate =
    generatedCount > 0 ? Math.round((sentCount / generatedCount) * 100) : 0;

  const karmaGainSinceStart = redditProfile
    ? redditProfile.totalKarma -
      (redditProfile.baselineKarma ?? redditProfile.totalKarma)
    : 0;

  const karmaWeekAgo =
    karmaSnapshotWeekAgo?.totalKarma ?? redditProfile?.baselineKarma ?? null;
  const karmaTwoWeeksAgo =
    karmaSnapshotTwoWeeksAgo?.totalKarma ?? redditProfile?.baselineKarma ?? null;

  const karmaGainThisWeek =
    redditProfile && karmaWeekAgo != null
      ? redditProfile.totalKarma - karmaWeekAgo
      : null;

  const karmaGainLastWeek =
    karmaWeekAgo != null && karmaTwoWeeksAgo != null
      ? karmaWeekAgo - karmaTwoWeeksAgo
      : null;

  const topKarmaSubreddit =
    redditProfile?.activeSubreddits?.[0]?.subreddit ?? null;

  const sentThisWeekBySection = {
    reply: sent.filter(
      (m) => m.type === "reply" && m.sentAt && m.sentAt >= weekAgo(),
    ).length,
    warmup: sent.filter(
      (m) => m.type === "warmup" && m.sentAt && m.sentAt >= weekAgo(),
    ).length,
    influence: sent.filter(
      (m) => m.type === "influence" && m.sentAt && m.sentAt >= weekAgo(),
    ).length,
  };

  const karmaBySubreddit = new Map(
    (redditProfile?.activeSubreddits ?? []).map((s) => [
      s.subreddit.toLowerCase().replace(/^r\//, ""),
      s.contributions ?? 0,
    ]),
  );

  const subredditAgg = new Map<
    string,
    { sent: number; banScores: number[] }
  >();
  for (const msg of sent) {
    const sub = msg.subreddit.replace(/^r\//i, "");
    const entry = subredditAgg.get(sub) ?? { sent: 0, banScores: [] };
    entry.sent += 1;
    entry.banScores.push(msg.safetyScore ?? 0);
    subredditAgg.set(sub, entry);
  }

  const subredditTable = [...subredditAgg.entries()]
    .map(([subreddit, row]) => ({
      subreddit,
      sent: row.sent,
      karma: karmaBySubreddit.get(subreddit.toLowerCase()) ?? 0,
      avgBanScore: avg(row.banScores),
    }))
    .sort((a, b) => b.sent - a.sent);

  const bestSubreddit = subredditTable[0]
    ? {
        name: subredditTable[0].subreddit,
        sent: subredditTable[0].sent,
        avgBanScore: subredditTable[0].avgBanScore,
        karma: subredditTable[0].karma,
      }
    : null;

  const dailySentLast30Days = Array.from({ length: 30 }, (_, i) => {
    const dayStart = startOfDay(new Date());
    dayStart.setDate(dayStart.getDate() - (29 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = sent.filter(
      (m) => m.sentAt && m.sentAt >= dayStart && m.sentAt < dayEnd,
    ).length;
    return {
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      }),
      count,
    };
  });

  const recentSent = sent
    .filter((m) => m.sentAt)
    .sort((a, b) => (b.sentAt!.getTime() ?? 0) - (a.sentAt!.getTime() ?? 0))
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      date: m.sentAt!,
      subreddit: m.subreddit,
      section: m.type,
      preview: (m.generatedBody ?? m.title).slice(0, 120),
      banScore: m.safetyScore ?? 0,
    }));

  const hasAnyData = generatedCount > 0 || sentCount > 0 || !!redditProfile;

  const subredditTrend =
    subsThisWeek === subsLastWeek
      ? ("stable" as const)
      : pctChange(subsThisWeek, subsLastWeek);

  return {
    lastUpdated: redditProfile?.scrapedAt ?? null,
    hasRedditProfile: !!redditProfile?.profileUrl,
    redditUsername: redditProfile?.username ?? null,
    redditProfileUrl: redditProfile?.profileUrl ?? null,
    hasAnyData,
    metrics: {
      generated: { total: generatedCount, ...sectionGenerated },
      sent: {
        total: sentCount,
        rate: sendRate,
        trendPct: pctChange(sentThisWeek, sentLastWeek),
        sentThisWeek,
      },
      activeSubreddits: {
        count: activeSubredditEntries.length,
        topSubreddit: topSentSubreddit,
        trend: subredditTrend,
      },
      avgBanScore,
      avgBanTrendPct:
        avgBanLastWeek > 0
          ? pctChange(Math.round(avgBanThisWeek * 10), Math.round(avgBanLastWeek * 10))
          : null,
      karmaGainSinceStart: redditProfile ? karmaGainSinceStart : 0,
      karmaTrendPct:
        karmaGainThisWeek != null && karmaGainLastWeek != null
          ? pctChange(
              Math.max(0, karmaGainThisWeek),
              Math.max(0, karmaGainLastWeek),
            )
          : null,
    },
    reddit: redditProfile
      ? {
          totalKarma: redditProfile.totalKarma,
          linkKarma: redditProfile.linkKarma,
          commentKarma: redditProfile.commentKarma,
          karmaGainSinceStart,
          postCount: redditProfile.postCount ?? 0,
          commentCount: redditProfile.commentCount ?? 0,
          accountAgeDays: redditProfile.accountCreatedAt
            ? Math.floor(
                (Date.now() - redditProfile.accountCreatedAt.getTime()) /
                  86400000,
              )
            : null,
          accountAgeLabel: formatAccountAge(
            redditProfile.accountCreatedAt
              ? Math.floor(
                  (Date.now() - redditProfile.accountCreatedAt.getTime()) /
                    86400000,
                )
              : null,
          ),
          accountCreatedAt: redditProfile.accountCreatedAt,
          activeSubreddits: redditProfile.activeSubreddits ?? [],
        }
      : null,
    impact: {
      sentThisWeek,
      karmaGainThisWeek,
      topSentSubreddit,
      topKarmaSubreddit,
      sentBySection,
      sentThisWeekBySection,
    },
    recentSent,
    dailySentLast30Days,
    subredditTable,
    bestSubreddit,
  };
}

export async function refreshDashboard(db: Database, teamId: string) {
  const profile = await db.query.teamRedditProfiles.findFirst({
    where: eq(teamRedditProfiles.teamId, teamId),
  });

  if (profile?.profileUrl) {
    await persistTeamRedditProfile(db, teamId, profile.profileUrl);
  }

  return buildDashboardData(db, teamId);
}
