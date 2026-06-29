import { getMaxPostAgeDate, redditDateFromUnix } from "@/server/reddit/freshness";

const USER_AGENT = "Mozilla/5.0 RedPulse/1.0";

export type RedditJsonPost = {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  url: string;
  permalink: string;
  created_utc: number;
  link_flair_text: string | null;
};

export type RedditJsonComment = {
  id: string;
  author: string;
  body: string;
  score: number;
};

type ListingChild<T> = { data: T };
type ListingResponse<T> = {
  data?: { children?: ListingChild<T>[] };
};

function parsePost(data: Record<string, unknown>, fallbackSub: string): RedditJsonPost | null {
  const id = String(data.id ?? "").replace(/^t3_/, "");
  if (!id || data.removed_by_category || data.over_18) return null;

  const subreddit = String(data.subreddit ?? fallbackSub).replace(/^r\//i, "");
  return {
    id,
    subreddit,
    title: String(data.title ?? ""),
    selftext: String(data.selftext ?? ""),
    author: String(data.author ?? "unknown"),
    score: Number(data.score ?? 0),
    num_comments: Number(data.num_comments ?? 0),
    url: String(data.url ?? ""),
    permalink: String(data.permalink ?? ""),
    created_utc: Number(data.created_utc ?? 0),
    link_flair_text: data.link_flair_text ? String(data.link_flair_text) : null,
  };
}

function isRecent(createdUtc: number): boolean {
  const minDate = getMaxPostAgeDate().getTime() / 1000;
  return createdUtc >= minDate;
}

export async function fetchSubredditJson(
  subreddit: string,
  limit = 25,
  sort: "new" | "hot" | "top" = "new",
  options?: { skipAgeFilter?: boolean },
): Promise<RedditJsonPost[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const urls = [
    `https://www.reddit.com/r/${encodeURIComponent(clean)}/${sort}.json?limit=${Math.min(limit, 100)}&raw_json=1`,
    `https://old.reddit.com/r/${encodeURIComponent(clean)}/${sort}.json?limit=${Math.min(limit, 100)}`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;

      const text = await res.text();
      if (text.trimStart().startsWith("<")) continue;

      const json = JSON.parse(text) as ListingResponse<Record<string, unknown>>;
      const posts = (json.data?.children ?? [])
        .map((c) => parsePost(c.data, clean))
        .filter((p): p is RedditJsonPost =>
          p !== null && (options?.skipAgeFilter || isRecent(p.created_utc)),
        );

      if (posts.length > 0) return posts.slice(0, limit);
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchPostCommentsJson(
  subreddit: string,
  postId: string,
  limit = 15,
): Promise<RedditJsonComment[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const id = postId.replace(/^t3_/, "");
  const url = `https://www.reddit.com/r/${encodeURIComponent(clean)}/comments/${id}.json?limit=${limit}&raw_json=1&sort=top`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as ListingResponse<Record<string, unknown>>[];
    const commentListing = json[1]?.data?.children ?? [];

    return commentListing
      .map((c) => c.data)
      .filter((d) => d && d.body && d.author !== "[deleted]" && d.author !== "AutoModerator")
      .slice(0, limit)
      .map((d) => ({
        id: String(d.id ?? "").replace(/^t1_/, ""),
        author: String(d.author ?? "unknown"),
        body: String(d.body ?? ""),
        score: Number(d.score ?? 0),
      }))
      .filter((c) => c.id && c.body.length > 2);
  } catch {
    return [];
  }
}

function parseComment(data: Record<string, unknown>): RedditJsonComment | null {
  const id = String(data.id ?? "").replace(/^t1_/, "");
  const body = String(data.body ?? "").trim();
  const author = String(data.author ?? "");
  if (!id || !body || body.length < 3) return null;
  if (author === "[deleted]" || author === "AutoModerator") return null;
  if (data.removed_by_category || body === "[removed]") return null;
  return {
    id,
    author,
    body,
    score: Number(data.score ?? 0),
  };
}

/** Top comments in a subreddit for voice analysis. */
export async function fetchSubredditTopComments(
  subreddit: string,
  limit = 50,
): Promise<RedditJsonComment[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const url = `https://www.reddit.com/r/${encodeURIComponent(clean)}/comments.json?sort=top&limit=100&raw_json=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const json = (await res.json()) as ListingResponse<Record<string, unknown>>;
      const fromListing = (json.data?.children ?? [])
        .map((c) => parseComment(c.data))
        .filter((c): c is RedditJsonComment => c !== null);

      if (fromListing.length >= 10) {
        return fromListing
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }
    }
  } catch {
    // fallback below
  }

  const posts = await fetchSubredditJson(clean, 15, "top", { skipAgeFilter: true });
  const aggregated: RedditJsonComment[] = [];

  for (const post of posts) {
    const comments = await fetchPostCommentsJson(clean, post.id, 20);
    aggregated.push(...comments);
  }

  return aggregated
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildRedditPostUrlFromJson(post: RedditJsonPost): string {
  if (post.permalink.startsWith("http")) return post.permalink;
  return `https://www.reddit.com${post.permalink}`;
}

export function redditPostDate(post: RedditJsonPost): Date {
  return redditDateFromUnix(post.created_utc);
}

export type SubredditAbout = {
  name: string;
  subscribers: number | null;
  activeUsers: number | null;
  postsPerDay: number | null;
};

export async function fetchSubredditAbout(subreddit: string): Promise<SubredditAbout | null> {
  const clean = subreddit.replace(/^r\//i, "");
  const url = `https://www.reddit.com/r/${encodeURIComponent(clean)}/about.json?raw_json=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: {
        display_name?: string;
        subscribers?: number;
        active_user_count?: number;
      };
    };

    const data = json.data;
    if (!data) return null;

    const postsPerDay = await estimateSubredditPostsPerDay(clean);

    return {
      name: data.display_name ?? clean,
      subscribers: data.subscribers ?? null,
      activeUsers: data.active_user_count ?? null,
      postsPerDay,
    };
  } catch {
    return null;
  }
}

export async function estimateSubredditPostsPerDay(subreddit: string): Promise<number | null> {
  const posts = await fetchSubredditJson(subreddit, 100, "new");
  if (!posts.length) return null;

  const dayAgo = Date.now() / 1000 - 86400;
  const recent = posts.filter((p) => p.created_utc >= dayAgo).length;
  if (recent === 0) return null;
  return recent;
}
