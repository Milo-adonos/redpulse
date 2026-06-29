import {
  expandKeywords,
  finalizeSubredditList,
  inferSubredditsFromText,
} from "@/server/reddit/subreddit-discovery";
import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_ONBOARDING } from "@/server/ai/constants";

export function extractKeywords(text: string): string[] {
  return expandKeywords([], text).slice(0, 15);
}

function pickMeta(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

function extractPageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);
}

export async function fetchSiteMetadata(url: string) {
  const normalized = url.startsWith("http") ? url : `https://${url}`;
  const res = await fetch(normalized, {
    headers: { "User-Agent": "RedPulse/1.0 (+https://redpulse.app)" },
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error(`Impossible d'accéder au site (${res.status})`);
  }

  const html = await res.text();
  const title =
    pickMeta(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    pickMeta(html, /<title[^>]*>([^<]+)<\/title>/i) ??
    new URL(normalized).hostname;

  const description =
    pickMeta(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ??
    pickMeta(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
    "";

  return { title, description, pageText: extractPageText(html), url: normalized };
}

type ProductAnalysis = {
  productName: string;
  description: string;
  keywords: string[];
  suggestedSubreddits: string[];
  targetAudience: string;
  valueProposition: string;
};

async function analyzeWithAi(input: {
  title: string;
  description: string;
  pageText: string;
  url: string;
}): Promise<ProductAnalysis> {
  const text = await callAnthropic({
    max_tokens: MAX_TOKENS_ONBOARDING,
    messages: [
      {
        role: "user",
        content: `Analyze for Reddit marketing. Return ONLY JSON:
{
  "productName": "short name",
  "description": "5-6 sentences: what it does, who for, pain points",
  "keywords": ["12-18 SHORT niche terms, 1-3w each"],
  "suggestedSubreddits": ["8-10 real subreddit names where TARGET CUSTOMERS post"],
  "targetAudience": "one sentence",
  "valueProposition": "one sentence"
}

Title: ${input.title}
Meta: ${input.description || "n/a"}
URL: ${input.url}
Content: ${input.pageText.slice(0, 1500) || "n/a"}`,
      },
    ],
  });

  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "").trim()) as ProductAnalysis;
  } catch {
    throw new Error("Réponse Claude invalide pour l'analyse produit");
  }
}

export async function analyzeProductFromSite(url: string) {
  const meta = await fetchSiteMetadata(url);
  const analysis = await analyzeWithAi(meta);

  const contextText = [
    analysis.productName,
    analysis.description,
    meta.description,
    meta.pageText.slice(0, 500),
  ].join(" ");

  const keywords = expandKeywords(analysis.keywords, contextText).slice(0, 18);
  const inferred = inferSubredditsFromText(contextText, 10);
  const subreddits = finalizeSubredditList({
    aiSuggestions: analysis.suggestedSubreddits,
    inferred,
    keywords,
    limit: 10,
  });

  const productPrompt = [
    `Product: ${analysis.productName || meta.title}`,
    analysis.description.trim(),
    "",
    `Target audience: ${analysis.targetAudience}`,
    `Problem solved: ${analysis.valueProposition}`,
    `Website: ${meta.url}`,
    "",
    "Use this context for all Reddit message generation. Write naturally, never sound like marketing.",
  ].join("\n");

  return {
    url: meta.url,
    title: analysis.productName || meta.title,
    suggestedDescription: productPrompt,
    productPrompt,
    keywords,
    subreddits,
    targetAudience: analysis.targetAudience,
    valueProposition: analysis.valueProposition,
  };
}
