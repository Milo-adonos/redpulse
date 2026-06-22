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
};

let cachedAppToken: { token: string; expiresAt: number } | null = null;

function parseListing(data: {
  data?: { children?: Array<{ data: RedditListingPost }> };
}): RedditListingPost[] {
  return (data.data?.children ?? []).map((c) => c.data);
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
      ? "Reddit bloque le scraping public (403). Ajoutez REDDIT_CLIENT_ID et REDDIT_CLIENT_SECRET dans .env.local pour le mode lecture app."
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

  return parseListing(await res.json());
}

export async function fetchSubredditPosts(
  subreddit: string,
  limit = 25,
  sort: "new" | "hot" = "new",
): Promise<RedditListingPost[]> {
  try {
    return await fetchPublicJson(subreddit, limit, sort);
  } catch (error) {
    if (
      error instanceof RedditFetchError &&
      (error.status === 403 || error.status === 429)
    ) {
      return fetchViaAppToken(subreddit, limit, sort);
    }
    throw error;
  }
}

export function matchKeywords(
  text: string,
  keywords: string[],
): string[] {
  const haystack = text.toLowerCase();
  return keywords.filter((kw) => haystack.includes(kw.toLowerCase()));
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
  // Posts dans les subreddits ciblés sans mot-clé exact restent exploitables
  if (score < 0.2) score = 0.2;
  return Math.min(Number(score.toFixed(2)), 0.99);
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
