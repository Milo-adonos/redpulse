import {
  finalizeSubredditList,
  inferSubredditsFromText,
} from "@/server/reddit/subreddit-discovery";
import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_LANDING_ANALYSIS } from "@/server/ai/constants";
import { fetchSiteMetadata, extractKeywords } from "@/server/project/site-analysis";

export type LandingAnalysis = {
  product_name: string;
  tagline: string;
  problem_solved: string;
  target_audience: string;
  key_features: string[];
  product_prompt: string;
  suggested_subreddits: string[];
  suggested_keywords: string[];
  competitors: string[];
};

function parseJsonBlock(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function cleanSubreddit(raw: string): string {
  return raw.replace(/^r\//i, "").trim();
}

function cleanCompetitor(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");
}

function normalizeAnalysis(
  raw: Record<string, unknown>,
  meta: { title: string; description: string; url: string; pageText: string },
): LandingAnalysis {
  const productName =
    String(raw.product_name ?? raw.productName ?? meta.title).trim() ||
    new URL(meta.url).hostname;

  const keywords = asStringArray(raw.suggested_keywords ?? raw.suggestedKeywords);
  const aiSubs = asStringArray(raw.suggested_subreddits ?? raw.suggestedSubreddits).map(
    cleanSubreddit,
  );
  const competitors = asStringArray(raw.competitors).map(cleanCompetitor).slice(0, 8);

  const contextText = [
    productName,
    String(raw.product_prompt ?? raw.productPrompt ?? ""),
    meta.description,
    meta.pageText.slice(0, 500),
  ].join(" ");

  const subreddits = finalizeSubredditList({
    aiSuggestions: aiSubs,
    inferred: inferSubredditsFromText(contextText, 10),
    keywords,
    limit: 10,
  });

  const productPrompt =
    String(raw.product_prompt ?? raw.productPrompt ?? "").trim() ||
    [
      `Product: ${productName}`,
      String(raw.problem_solved ?? raw.problemSolved ?? meta.description),
      `Target: ${String(raw.target_audience ?? raw.targetAudience ?? "SaaS buyers")}`,
      `Website: ${meta.url}`,
    ].join("\n");

  return {
    product_name: productName,
    tagline: String(raw.tagline ?? meta.description.slice(0, 120)),
    problem_solved: String(
      raw.problem_solved ?? raw.problemSolved ?? meta.description ?? productName,
    ),
    target_audience: String(
      raw.target_audience ?? raw.targetAudience ?? "People interested in this product",
    ),
    key_features: asStringArray(raw.key_features ?? raw.keyFeatures).slice(0, 6),
    product_prompt: productPrompt,
    suggested_subreddits: subreddits,
    suggested_keywords: keywords.length
      ? keywords.slice(0, 15)
      : extractKeywords(contextText).slice(0, 12),
    competitors,
  };
}

export async function scrapeLandingPage(url: string) {
  const meta = await fetchSiteMetadata(url);
  return {
    url: meta.url,
    domain: new URL(meta.url).hostname.replace(/^www\./, ""),
    favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(meta.url)}&sz=64`,
    title: meta.title,
    description: meta.description,
    pageText: meta.pageText.slice(0, 2000),
  };
}

async function analyzeWithClaude(meta: {
  title: string;
  description: string;
  pageText: string;
  url: string;
}): Promise<LandingAnalysis> {
  const text = await callAnthropic({
    max_tokens: MAX_TOKENS_LANDING_ANALYSIS,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: `Analyze this landing page and return ONLY this JSON, nothing else, no markdown:
{
  "product_name": "...",
  "tagline": "...",
  "problem_solved": "...",
  "target_audience": "...",
  "key_features": ["...", "...", "..."],
  "product_prompt": "2-3 sentences for Reddit marketing context",
  "suggested_subreddits": ["r/Nails", "r/NailArt"],
  "suggested_keywords": ["nail design", "nail art"],
  "competitors": ["youcamnails.com", "nailsnaps.com"]
}

Landing page: ${meta.pageText.slice(0, 2000)}`,
      },
    ],
  });

  const parsed = parseJsonBlock(text);
  if (!parsed) {
    throw new Error("Réponse Claude invalide pour l'analyse landing");
  }
  return normalizeAnalysis(parsed, meta);
}

export async function analyzeScrapedContent(meta: {
  title: string;
  description: string;
  pageText: string;
  url: string;
}) {
  return analyzeWithClaude(meta);
}

export async function analyzeLandingPage(url: string) {
  const scraped = await scrapeLandingPage(url);
  const analysis = await analyzeScrapedContent(scraped);

  return {
    url: scraped.url,
    domain: scraped.domain,
    favicon: scraped.favicon,
    pageText: scraped.pageText,
    analysis,
  };
}

export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(
      /^www\./,
      "",
    );
  } catch {
    return url;
  }
}
