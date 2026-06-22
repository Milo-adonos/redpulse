import {
  expandKeywords,
  finalizeSubredditList,
  inferSubredditsFromText,
} from "@/server/reddit/subreddit-discovery";

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
}): Promise<ProductAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 900,
      messages: [
        {
          role: "user",
          content: `Analyze this product website for Reddit marketing. Return ONLY JSON:
{
  "productName": "short name",
  "description": "6-8 sentences English: what it does, who it's for, pain points, how to mention naturally on Reddit",
  "keywords": ["12-18 SHORT terms, 1-3 words each, niche-specific — e.g. nail, manicure, salon, NOT marketing/saas/startup"],
  "suggestedSubreddits": ["8-10 real subreddit names WITHOUT r/ where TARGET CUSTOMERS post. For nail/beauty: Nails, NailArt, beauty, SalonOwners — NEVER SaaS/startups/marketing unless dev tool"],
  "targetAudience": "one sentence",
  "valueProposition": "one sentence"
}

Title: ${input.title}
Meta: ${input.description || "n/a"}
URL: ${input.url}
Content: ${input.pageText.slice(0, 2000) || "n/a"}`,
        },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const raw = data.content.find((b) => b.type === "text")?.text ?? "";
  try {
    return JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "").trim()) as ProductAnalysis;
  } catch {
    return null;
  }
}

function fallbackAnalysis(meta: {
  title: string;
  description: string;
  pageText: string;
  url: string;
}): ProductAnalysis {
  const base = [meta.description, meta.pageText.slice(0, 600)].filter(Boolean).join(" ");
  const inferred = inferSubredditsFromText(`${meta.title} ${base}`, 8);

  return {
    productName: meta.title.split("|")[0]?.trim() || meta.title,
    description: base || `${meta.title}. ${meta.url}`,
    keywords: expandKeywords([], meta.title, base),
    suggestedSubreddits: inferred,
    targetAudience: "People interested in this product",
    valueProposition: meta.description || meta.title,
  };
}

export async function analyzeProductFromSite(url: string) {
  const meta = await fetchSiteMetadata(url);
  const ai = await analyzeWithAi(meta);
  const analysis = ai ?? fallbackAnalysis(meta);

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

  return {
    url: meta.url,
    title: analysis.productName || meta.title,
    suggestedDescription: [
      analysis.description.trim(),
      "",
      `Target audience: ${analysis.targetAudience}`,
      `Value proposition: ${analysis.valueProposition}`,
      `Website: ${meta.url}`,
    ].join("\n"),
    keywords,
    subreddits,
    targetAudience: analysis.targetAudience,
    valueProposition: analysis.valueProposition,
  };
}
