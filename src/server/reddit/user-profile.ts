const USER_AGENT = "Mozilla/5.0 RedPulse/1.0";

export type RedditUserProfile = {
  username: string;
  karma: number | null;
  linkKarma: number | null;
  commentKarma: number | null;
  accountAgeDays: number | null;
  postCount: number | null;
  commentCount: number | null;
};

async function countUserListing(
  username: string,
  kind: "submitted" | "comments",
): Promise<number | null> {
  const clean = username.replace(/^u\//i, "").trim();
  const url = `https://www.reddit.com/user/${encodeURIComponent(clean)}/${kind}.json?limit=100&raw_json=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: { children?: unknown[]; dist?: number };
    };
    const listed = json.data?.children?.length ?? 0;
    const total = json.data?.dist;
    if (typeof total === "number") return total;
    return listed > 0 ? listed : null;
  } catch {
    return null;
  }
}

export async function fetchRedditUserProfile(
  username: string,
): Promise<RedditUserProfile | null> {
  const clean = username.replace(/^u\//i, "").trim();
  if (!clean || clean === "unknown" || clean === "[deleted]") return null;

  const url = `https://www.reddit.com/user/${encodeURIComponent(clean)}/about.json?raw_json=1`;

  try {
    const [res, postCount, commentCount] = await Promise.all([
      fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        next: { revalidate: 3600 },
      }),
      countUserListing(clean, "submitted"),
      countUserListing(clean, "comments"),
    ]);

    if (!res.ok) return null;

    const json = (await res.json()) as {
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

    const ageDays = data.created_utc
      ? Math.floor((Date.now() / 1000 - data.created_utc) / 86400)
      : null;

    return {
      username: data.name ?? clean,
      karma: data.total_karma ?? null,
      linkKarma: data.link_karma ?? null,
      commentKarma: data.comment_karma ?? null,
      accountAgeDays: ageDays,
      postCount,
      commentCount,
    };
  } catch {
    return null;
  }
}
