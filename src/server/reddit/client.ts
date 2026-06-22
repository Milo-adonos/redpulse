import {
  getMaxPostAgeIsoDate,
  isWithinArchivePostAge,
  isWithinMaxPostAge,
} from "@/server/reddit/freshness";

const ARCTIC_SHIFT_BASE =
  process.env.ARCTIC_SHIFT_API_URL ?? "https://arctic-shift.photon-reddit.com";

const USER_AGENT =
  process.env.REDDIT_USER_AGENT ??
  "web:redpulse:1.0.0 (by /u/redpulse_app)";

export class RedditFetchError extends Error {
  status: number;
  subreddit: string;

  constructor(message: string, status: number, subreddit: string) {
    super(message);
    this.name = "RedditFetchError";
    this.status = status;
    this.subreddit = subreddit;
  }
}

export type RedditListingPost = {
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
};

let cachedAppToken: { token: string; expiresAt: number } | null = null;

function parseListing(data: {
  data?: {
    children?: Array<{ data: RedditListingPost & { created_utc?: number } }>;
  };
}): RedditListingPost[] {
  return (data.data?.children ?? [])
    .map((c) => ({
      ...c.data,
      created_utc: c.data.created_utc ?? 0,
      permalink: buildRedditPostUrl(
        c.data.subreddit,
        c.data.id,
        c.data.permalink,
        c.data.url,
      ),
    }))
    .filter((post) => isWithinMaxPostAge(post.created_utc));
}

export function isRedditUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === "reddit.com" ||
      host === "www.reddit.com" ||
      host === "old.reddit.com" ||
      host === "np.reddit.com"
    );
  } catch {
    return false;
  }
}

function pickRedditPermalinkSource(
  permalink: string | undefined | null,
  url: string | undefined | null,
): string | undefined {
  const permalinkRaw = (permalink ?? "").trim();
  if (permalinkRaw) return permalinkRaw;

  const urlRaw = (url ?? "").trim();
  if (urlRaw && isRedditUrl(urlRaw)) return urlRaw;

  return undefined;
}

export function normalizeRedditPermalink(
  permalink: string | undefined | null,
  subreddit: string,
  redditId: string,
): string {
  const cleanSub = subreddit.replace(/^r\//i, "");
  const cleanId = redditId.replace(/^t3_/, "");
  let raw = (permalink ?? "").trim();

  const embedded = raw.match(/https:\/\/www\.reddit\.com\/[^\s"']+/i);
  if (embedded) {
    raw = embedded[0]!;
  }

  raw = raw.replace(/^https?:\/\/reddit\.com(?=https?:\/\/)/i, "");

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    if (isRedditUrl(raw)) {
      const normalized = raw
        .replace(/^http:\/\//i, "https://")
        .replace(/^(https:\/\/)reddit\.com/i, "$1www.reddit.com")
        .split("?")[0]!
        .replace(/\/+$/, "");
      return `${normalized}/`;
    }
  }

  if (raw.startsWith("/")) {
    return `https://www.reddit.com${raw.split("?")[0]!.replace(/\/+$/, "")}/`;
  }

  if (raw.includes("/comments/")) {
    return `https://www.reddit.com/${raw.replace(/^\//, "").split("?")[0]!.replace(/\/+$/, "")}/`;
  }

  return `https://www.reddit.com/r/${cleanSub}/comments/${cleanId}/`;
}

export function buildRedditPostUrl(
  subreddit: string,
  redditId: string,
  permalink?: string | null,
  url?: string | null,
): string {
  return normalizeRedditPermalink(
    pickRedditPermalinkSource(permalink, url),
    subreddit,
    redditId,
  );
}

function mapPullPushPost(
  post: {
    id?: string;
    subreddit?: string;
    title?: string;
    selftext?: string;
    author?: string;
    score?: number;
    num_comments?: number;
    url?: string;
    permalink?: string;
    created_utc?: number;
  },
  fallbackSubreddit: string,
): RedditListingPost | null {
  if (!post.id || !post.title) return null;
  const createdUtc = post.created_utc ?? Math.floor(Date.now() / 1000);
  if (!isWithinArchivePostAge(createdUtc)) return null;

  const subreddit = post.subreddit ?? fallbackSubreddit;
  return {
    id: post.id,
    subreddit,
    title: post.title,
    selftext: post.selftext ?? "",
    author: post.author ?? "unknown",
    score: post.score ?? 0,
    num_comments: post.num_comments ?? 0,
    url: post.url ?? "",
    created_utc: createdUtc,
    permalink: buildRedditPostUrl(
      subreddit,
      post.id,
      post.permalink,
      post.url,
    ),
  };
}

async function fetchViaPullPush(
  subreddit: string,
  limit: number,
  sort: "new" | "hot",
  keywords?: string[],
): Promise<RedditListingPost[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const sortType = sort === "hot" ? "score" : "created_utc";
  const url = new URL("https://api.pullpush.io/reddit/search/submission/");
  url.searchParams.set("subreddit", clean);
  url.searchParams.set("size", String(Math.min(limit * 3, 100)));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("sort_type", sortType);
  // Freshness is applied client-side — PullPush `after` returns empty for most subs.

  if (keywords?.length) {
    url.searchParams.set("q", keywords.slice(0, 8).join(" OR "));
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new RedditFetchError(
      `Source PullPush indisponible (${res.status}) pour r/${clean}`,
      res.status,
      clean,
    );
  }

  const payload = (await res.json()) as {
    data?: Array<{
      id?: string;
      subreddit?: string;
      title?: string;
      selftext?: string;
      author?: string;
      score?: number;
      num_comments?: number;
      url?: string;
      permalink?: string;
      created_utc?: number;
    }>;
  };

  const posts = (payload.data ?? [])
    .map((post) => mapPullPushPost(post, clean))
    .filter((post): post is RedditListingPost => post !== null)
    .sort((a, b) => b.created_utc - a.created_utc);

  if (keywords?.length) {
    return posts
      .filter((post) => matchKeywords(`${post.title} ${post.selftext}`, keywords).length > 0)
      .slice(0, limit);
  }

  return posts.slice(0, limit);
}

type ArcticShiftPost = {
  id?: string;
  subreddit?: string;
  title?: string;
  selftext?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  url?: string;
  permalink?: string;
  created_utc?: number;
};

function mapArcticShiftPost(
  post: ArcticShiftPost,
  fallbackSubreddit: string,
): RedditListingPost | null {
  if (!post.id || !post.title) return null;
  const createdUtc = post.created_utc ?? 0;
  if (!isWithinMaxPostAge(createdUtc)) return null;

  const subreddit = (post.subreddit ?? fallbackSubreddit).replace(/^r\//i, "");
  return {
    id: post.id.replace(/^t3_/, ""),
    subreddit,
    title: post.title,
    selftext: post.selftext ?? "",
    author: post.author ?? "unknown",
    score: post.score ?? 0,
    num_comments: post.num_comments ?? 0,
    url: post.url ?? "",
    created_utc: createdUtc,
    permalink: buildRedditPostUrl(
      subreddit,
      post.id.replace(/^t3_/, ""),
      post.permalink,
      post.url,
    ),
  };
}

async function fetchViaArcticShift(
  subreddit: string,
  limit: number,
  sort: "new" | "hot",
  keywords?: string[],
): Promise<RedditListingPost[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const url = new URL(`${ARCTIC_SHIFT_BASE}/api/posts/search`);
  url.searchParams.set("subreddit", clean);
  url.searchParams.set("limit", String(Math.min(limit * 2, 100)));
  url.searchParams.set("sort", "desc");
  url.searchParams.set("after", getMaxPostAgeIsoDate());

  if (keywords?.length) {
    const query = keywords
      .slice(0, 4)
      .map((kw) => kw.split(/\s+/)[0])
      .filter((w) => w && w.length > 3)
      .join(" ");
    if (query) url.searchParams.set("query", query);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (res.status === 429) {
    throw new RedditFetchError(
      `Arctic Shift rate limit pour r/${clean}`,
      429,
      clean,
    );
  }

  if (!res.ok) {
    throw new RedditFetchError(
      `Arctic Shift indisponible (${res.status}) pour r/${clean}`,
      res.status,
      clean,
    );
  }

  const payload = (await res.json()) as { data?: ArcticShiftPost[] };
  let posts = (payload.data ?? [])
    .map((post) => mapArcticShiftPost(post, clean))
    .filter((post): post is RedditListingPost => post !== null);

  if (keywords?.length) {
    posts = posts.filter(
      (post) =>
        matchKeywords(`${post.title} ${post.selftext}`, keywords).length > 0,
    );
  }

  if (sort === "hot") {
    posts.sort((a, b) => b.score - a.score);
  } else {
    posts.sort((a, b) => b.created_utc - a.created_utc);
  }

  return posts.slice(0, limit);
}

async function fetchPublicJson(
  subreddit: string,
  limit: number,
  sort: "new" | "hot",
): Promise<RedditListingPost[]> {
  const clean = subreddit.replace(/^r\//i, "");
  const urls = [
    `https://www.reddit.com/r/${encodeURIComponent(clean)}/${sort}.json?limit=${limit}&raw_json=1`,
    `https://old.reddit.com/r/${encodeURIComponent(clean)}/${sort}.json?limit=${limit}`,
  ];

  let lastStatus = 0;
  for (const url of urls) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 0 },
    });
    lastStatus = res.status;
    if (!res.ok) continue;

    const text = await res.text();
    if (text.trimStart().startsWith("<")) continue;

    try {
      return parseListing(JSON.parse(text) as {
        data?: { children?: Array<{ data: RedditListingPost }> };
      });
    } catch {
      continue;
    }
  }

  throw new RedditFetchError(
    lastStatus === 403
      ? `Reddit JSON public bloqué (403) pour r/${clean}`
      : `Reddit inaccessible (${lastStatus}) pour r/${clean}`,
    lastStatus,
    clean,
  );
}

async function fetchViaAppToken(
  subreddit: string,
  limit: number,
  sort: "new" | "hot",
): Promise<RedditListingPost[]> {
  const clean = subreddit.replace(/^r\//i, "");
  let token: string | null = null;

  if (cachedAppToken && cachedAppToken.expiresAt > Date.now()) {
    token = cachedAppToken.token;
  } else {
    token = await getRedditAppToken();
    if (token) {
      cachedAppToken = { token, expiresAt: Date.now() + 55 * 60 * 1000 };
    }
  }

  if (!token) {
    throw new RedditFetchError(
      "Reddit bloqué et credentials app absents. Renseignez REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET dans .env.local (app type « script » sur reddit.com/prefs/apps).",
      403,
      clean,
    );
  }

  const res = await fetch(
    `https://oauth.reddit.com/r/${encodeURIComponent(clean)}/${sort}?limit=${limit}&raw_json=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
      },
      next: { revalidate: 0 },
    },
  );

  if (!res.ok) {
    throw new RedditFetchError(
      `Reddit OAuth read failed (${res.status}) for r/${clean}`,
      res.status,
      clean,
    );
  }

  return parseListing(await res.json()).map((post) => ({
    ...post,
    permalink: normalizeRedditPermalink(post.permalink, post.subreddit, post.id),
  }));
}

function filterRecentPosts(posts: RedditListingPost[]): RedditListingPost[] {
  return posts
    .filter((post) => isWithinMaxPostAge(post.created_utc))
    .sort((a, b) => b.created_utc - a.created_utc);
}

function filterByKeywords(
  posts: RedditListingPost[],
  keywords?: string[],
): RedditListingPost[] {
  if (!keywords?.length) return posts;
  return posts.filter(
    (post) =>
      matchKeywords(`${post.title} ${post.selftext}`, keywords).length > 0,
  );
}

export async function fetchSubredditPosts(
  subreddit: string,
  limit = 25,
  sort: "new" | "hot" = "new",
  keywords?: string[],
): Promise<RedditListingPost[]> {
  const hasAppCreds =
    Boolean(process.env.REDDIT_CLIENT_ID) &&
    Boolean(process.env.REDDIT_CLIENT_SECRET);

  const finalizeLive = (posts: RedditListingPost[]) =>
    filterRecentPosts(filterByKeywords(posts, keywords)).slice(0, limit);

  const finalizeArchive = (posts: RedditListingPost[]) =>
    filterByKeywords(posts, keywords).slice(0, limit);

  // 1. Arctic Shift — live posts, no OAuth (primary)
  try {
    const livePosts = await fetchViaArcticShift(subreddit, limit, sort, keywords);
    if (livePosts.length > 0) return livePosts;
  } catch (arcticError) {
    console.warn("[reddit] Arctic Shift:", arcticError);
  }

  // 2. Reddit OAuth app token (optional)
  if (hasAppCreds) {
    try {
      const oauthPosts = finalizeLive(
        await fetchViaAppToken(subreddit, limit, sort),
      );
      if (oauthPosts.length > 0) return oauthPosts;
    } catch (oauthError) {
      console.warn("[reddit] OAuth:", oauthError);
    }
  }

  // 3. PullPush archive fallback
  try {
    const pullPosts = finalizeArchive(
      await fetchViaPullPush(subreddit, limit, sort, keywords),
    );
    if (pullPosts.length > 0) return pullPosts;
  } catch (pullPushError) {
    console.warn("[reddit] PullPush:", pullPushError);
  }

  // 4. Public JSON (often blocked on Vercel)
  try {
    const publicPosts = finalizeLive(await fetchPublicJson(subreddit, limit, sort));
    if (publicPosts.length > 0) return publicPosts;
  } catch (publicError) {
    console.warn("[reddit] Public JSON failed:", publicError);
  }

  return [];
}

export function matchKeywords(
  text: string,
  keywords: string[],
): string[] {
  const haystack = text.toLowerCase();
  const matched = new Set<string>();

  for (const kw of keywords) {
    const needle = kw.toLowerCase().trim();
    if (!needle) continue;
    if (haystack.includes(needle)) {
      matched.add(kw);
      continue;
    }
    for (const word of needle.split(/[\s,/]+/)) {
      if (word.length > 2 && wordMatchesHaystack(haystack, word)) {
        matched.add(word);
      }
    }
  }

  return [...matched];
}

export function estimateIntentScore(
  title: string,
  body: string,
  matched: string[],
): number {
  let score = Math.min(matched.length * 0.15, 0.45);
  const combined = `${title} ${body}`.toLowerCase();
  if (/\$\d+|budget|pricing|looking for|recommend|best tool/.test(combined)) {
    score += 0.35;
  }
  if (/\?/.test(title)) score += 0.1;
  return Math.min(Number(score.toFixed(2)), 0.99);
}

export function isInTargetSubreddit(
  subreddit: string,
  targetSubreddits: string[],
): boolean {
  if (!targetSubreddits.length) return false;
  const clean = subreddit.replace(/^r\//i, "").toLowerCase();
  return targetSubreddits.some(
    (sub) => sub.replace(/^r\//i, "").toLowerCase() === clean,
  );
}

function wordMatchesHaystack(haystack: string, word: string): boolean {
  if (word.length <= 2) return false;
  if (haystack.includes(word)) return true;
  if (word.endsWith("s") && word.length > 4 && haystack.includes(word.slice(0, -1))) {
    return true;
  }
  if (!word.endsWith("s") && haystack.includes(`${word}s`)) return true;
  return false;
}

function isNailBeautyNiche(keywords: string[]): boolean {
  const blob = keywords.join(" ").toLowerCase();
  return /nail|manicure|polish|salon|beauty|pedicure|gel/.test(blob);
}

function isOffTopicForNailNiche(title: string, body: string): boolean {
  const text = `${title} ${body}`.toLowerCase();
  if (/manicure|pedicure|nail art|gel polish|acrylic|salon|cuticle|press on|polish/.test(text)) {
    return false;
  }
  if (
    /garden|lawn|potting|hammer|screw|construction|diy tool|woodwork|hardware store/.test(
      text,
    ) &&
    /\bnails?\b/.test(text)
  ) {
    return true;
  }
  return false;
}

export function isRelevantToIcp(
  title: string,
  body: string,
  keywords: string[],
  targetSubreddits?: string[],
  subreddit?: string,
): boolean {
  if (targetSubreddits?.length && subreddit) {
    if (!isInTargetSubreddit(subreddit, targetSubreddits)) {
      return false;
    }
  }

  if (!keywords.length) return false;

  const combined = `${title} ${body}`;
  if (isNailBeautyNiche(keywords) && isOffTopicForNailNiche(title, body)) {
    return false;
  }

  return matchKeywords(combined, keywords).length > 0;
}

export async function getRedditAppToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function refreshUserToken(
  refreshToken: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in,
  };
}

export async function postRedditComment(
  accessToken: string,
  thingId: string,
  text: string,
): Promise<{ id: string; permalink: string }> {
  const res = await fetch("https://oauth.reddit.com/api/comment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      api_type: "json",
      thing_id: thingId.startsWith("t3_") ? thingId : `t3_${thingId}`,
      text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Publication Reddit échouée: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    json?: {
      errors?: unknown[];
      data?: { things?: Array<{ data: { id: string; permalink: string } }> };
    };
  };

  if (data.json?.errors?.length) {
    throw new Error(`Reddit: ${JSON.stringify(data.json.errors)}`);
  }

  const comment = data.json?.data?.things?.[0]?.data;
  if (!comment?.id) {
    throw new Error("Réponse Reddit invalide");
  }

  return { id: comment.id, permalink: comment.permalink };
}

export function getRedditAuthUrl(state: string): string {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri =
    process.env.REDDIT_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL}/api/reddit/callback`;

  if (!clientId) throw new Error("REDDIT_CLIENT_ID manquant");

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    state,
    redirect_uri: redirectUri,
    duration: "permanent",
    scope: "submit read identity edit",
  });

  return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
}

export async function exchangeRedditCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const redirectUri =
    process.env.REDDIT_REDIRECT_URI ??
    `${process.env.NEXTAUTH_URL}/api/reddit/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Credentials Reddit manquantes");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth Reddit échoué (${res.status})`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  };
}

export async function fetchRedditIdentity(accessToken: string): Promise<string> {
  const res = await fetch("https://oauth.reddit.com/api/v1/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error("Impossible de lire le profil Reddit");
  const data = (await res.json()) as { name: string };
  return data.name;
}

export async function sendRedditDM(
  accessToken: string,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  const res = await fetch("https://oauth.reddit.com/api/compose", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      api_type: "json",
      to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Envoi DM échoué (${res.status})`);
  }

  const data = (await res.json()) as { json?: { errors?: unknown[] } };
  if (data.json?.errors?.length) {
    throw new Error(`Reddit DM: ${JSON.stringify(data.json.errors)}`);
  }
}
