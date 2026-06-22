import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  discoveredPosts,
  keywordFilters,
  teams,
} from "@/server/db/schema";
import {
  estimateIntentScore,
  fetchSubredditPosts,
  matchKeywords,
} from "@/server/reddit/client";

const DEFAULT_SUBREDDITS = ["SaaS", "startups", "marketing", "entrepreneur"];
const DEFAULT_KEYWORDS = [
  "saas",
  "marketing",
  "automation",
  "growth",
  "reddit",
  "tool",
  "startup",
];

export async function scrapeTeamDiscovery(db: Database, teamId: string) {
  const filter = await db.query.keywordFilters.findFirst({
    where: and(
      eq(keywordFilters.teamId, teamId),
      eq(keywordFilters.isActive, true),
    ),
  });

  const subreddits =
    filter?.subreddits?.length ? filter.subreddits : DEFAULT_SUBREDDITS;
  const keywords =
    filter?.keywords?.length ? filter.keywords : DEFAULT_KEYWORDS;

  let inserted = 0;
  let lastError: Error | null = null;
  let fetchedAny = false;

  for (const sub of subreddits) {
    let posts;
    try {
      posts = await fetchSubredditPosts(sub, 15);
      fetchedAny = true;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[scraper] r/${sub}:`, error);
      continue;
    }

    for (const post of posts.slice(0, 12)) {
      const combined = `${post.title} ${post.selftext ?? ""}`;
      const matched = matchKeywords(combined, keywords);
      const intentScore = estimateIntentScore(
        post.title,
        post.selftext ?? "",
        matched,
      );

      try {
        await db
          .insert(discoveredPosts)
          .values({
            teamId,
            redditId: post.id,
            subreddit: post.subreddit,
            title: post.title,
            body: post.selftext || null,
            author: post.author,
            score: post.score,
            numComments: post.num_comments,
            url: post.url,
            permalink: `https://reddit.com${post.permalink}`,
            matchedKeywords: matched,
            intentScore: String(intentScore),
          })
          .onConflictDoNothing();
        inserted++;
      } catch {
        // duplicate or race
      }
    }
  }

  if (!fetchedAny && lastError) {
    throw lastError;
  }

  return { inserted, subreddits: subreddits.length };
}

export async function scrapeAllTeams(db: Database) {
  const allTeams = await db.select({ id: teams.id }).from(teams);
  const results = [];

  for (const team of allTeams) {
    const result = await scrapeTeamDiscovery(db, team.id);
    results.push({ teamId: team.id, ...result });
  }

  return results;
}
