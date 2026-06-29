import { eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  redditKarmaSnapshots,
  teamRedditProfiles,
} from "@/server/db/schema";

const USER_AGENT = "Mozilla/5.0 RedPulse/1.0";

export type ActiveSubreddit = {
  subreddit: string;
  contributions: number;
};

export type ScrapedRedditAccount = {
  username: string;
  profileUrl: string;
  totalKarma: number;
  linkKarma: number;
  commentKarma: number;
  postCount: number | null;
  commentCount: number | null;
  activeSubreddits: ActiveSubreddit[];
  accountCreatedAt: Date | null;
  accountAgeDays: number | null;
};

export function parseRedditProfileUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const match = url.pathname.match(/^\/u(?:ser)?\/([^/]+)\/?$/i);
    if (!match?.[1]) return null;
    const username = decodeURIComponent(match[1]);
    if (!username || username === "[deleted]") return null;
    return username;
  } catch {
    return null;
  }
}

async function fetchListing(
  username: string,
  kind: "submitted" | "comments",
): Promise<{
  count: number | null;
  subreddits: Map<string, number>;
}> {
  const url = `https://www.reddit.com/user/${encodeURIComponent(username)}/${kind}.json?limit=100&raw_json=1`;
  const subreddits = new Map<string, number>();

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return { count: null, subreddits };

    const json = (await res.json()) as {
      data?: {
        children?: Array<{ data?: { subreddit?: string } }>;
        dist?: number;
      };
    };

    for (const child of json.data?.children ?? []) {
      const sub = child.data?.subreddit?.replace(/^r\//i, "");
      if (!sub) continue;
      subreddits.set(sub, (subreddits.get(sub) ?? 0) + 1);
    }

    const dist = json.data?.dist;
    const count =
      typeof dist === "number"
        ? dist
        : (json.data?.children?.length ?? 0) || null;

    return { count, subreddits };
  } catch {
    return { count: null, subreddits };
  }
}

export async function scrapeRedditAccount(
  profileUrl: string,
): Promise<ScrapedRedditAccount | null> {
  const username = parseRedditProfileUrl(profileUrl);
  if (!username) return null;

  const aboutUrl = `https://www.reddit.com/user/${encodeURIComponent(username)}/about.json?raw_json=1`;

  try {
    const [aboutRes, submitted, comments] = await Promise.all([
      fetch(aboutUrl, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        cache: "no-store",
      }),
      fetchListing(username, "submitted"),
      fetchListing(username, "comments"),
    ]);

    if (!aboutRes.ok) return null;

    const json = (await aboutRes.json()) as {
      data?: {
        name?: string;
        total_karma?: number;
        link_karma?: number;
        comment_karma?: number;
        created_utc?: number;
      };
    };

    const data = json.data;
    if (!data) return null;

    const merged = new Map<string, number>();
    for (const map of [submitted.subreddits, comments.subreddits]) {
      for (const [sub, n] of map) {
        merged.set(sub, (merged.get(sub) ?? 0) + n);
      }
    }

    const activeSubreddits = [...merged.entries()]
      .map(([subreddit, contributions]) => ({ subreddit, contributions }))
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 20);

    const accountCreatedAt = data.created_utc
      ? new Date(data.created_utc * 1000)
      : null;
    const accountAgeDays = data.created_utc
      ? Math.floor((Date.now() / 1000 - data.created_utc) / 86400)
      : null;

    return {
      username: data.name ?? username,
      profileUrl: profileUrl.trim(),
      totalKarma: data.total_karma ?? 0,
      linkKarma: data.link_karma ?? 0,
      commentKarma: data.comment_karma ?? 0,
      postCount: submitted.count,
      commentCount: comments.count,
      activeSubreddits,
      accountCreatedAt,
      accountAgeDays,
    };
  } catch {
    return null;
  }
}

export async function persistTeamRedditProfile(
  db: Database,
  teamId: string,
  profileUrl: string,
): Promise<ScrapedRedditAccount | null> {
  const scraped = await scrapeRedditAccount(profileUrl);
  if (!scraped) return null;

  const existing = await db.query.teamRedditProfiles.findFirst({
    where: eq(teamRedditProfiles.teamId, teamId),
  });

  const baselineKarma =
    existing?.baselineKarma ?? scraped.totalKarma;

  await db
    .insert(teamRedditProfiles)
    .values({
      teamId,
      profileUrl: scraped.profileUrl,
      username: scraped.username,
      totalKarma: scraped.totalKarma,
      linkKarma: scraped.linkKarma,
      commentKarma: scraped.commentKarma,
      postCount: scraped.postCount,
      commentCount: scraped.commentCount,
      activeSubreddits: scraped.activeSubreddits,
      accountCreatedAt: scraped.accountCreatedAt,
      baselineKarma,
      scrapedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: teamRedditProfiles.teamId,
      set: {
        profileUrl: scraped.profileUrl,
        username: scraped.username,
        totalKarma: scraped.totalKarma,
        linkKarma: scraped.linkKarma,
        commentKarma: scraped.commentKarma,
        postCount: scraped.postCount,
        commentCount: scraped.commentCount,
        activeSubreddits: scraped.activeSubreddits,
        accountCreatedAt: scraped.accountCreatedAt,
        baselineKarma,
        scrapedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  await db.insert(redditKarmaSnapshots).values({
    teamId,
    totalKarma: scraped.totalKarma,
    recordedAt: new Date(),
  });

  return scraped;
}
