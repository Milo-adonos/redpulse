import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_SCORING } from "@/server/ai/constants";

export type RelevanceSection = "reply" | "warmup" | "influence" | "irrelevant";

export type RelevanceResult = {
  score: number;
  section: RelevanceSection;
  reason: string;
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

function normalizeSection(raw: unknown): RelevanceSection {
  const value = String(raw ?? "").toLowerCase();
  if (value === "reply" || value === "warmup" || value === "influence") {
    return value;
  }
  return "irrelevant";
}

function sectionFromScore(score: number): RelevanceSection {
  if (score >= 80) return "reply";
  if (score >= 60) return "influence";
  if (score >= 40) return "warmup";
  return "irrelevant";
}

function extractTerms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length > 3)
    .slice(0, 40);
}

/** Keyword-based scoring for scrape refresh — no Claude calls. */
export function scorePostRelevanceHeuristic(input: {
  productPrompt: string;
  keywords?: string[];
  title: string;
  body: string;
}): RelevanceResult {
  const text = `${input.title} ${input.body}`.toLowerCase();
  const terms = [
    ...new Set([
      ...extractTerms(input.productPrompt),
      ...(input.keywords ?? []).map((k) => k.toLowerCase()),
    ]),
  ].filter((term) => !term.startsWith("__"));

  const redditSignals = [
    "reddit",
    "subreddit",
    "karma",
    "ban",
    "banned",
    "marketing",
    "growth",
    "saas",
    "tool",
    "promote",
    "traction",
  ];

  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    if (text.includes(term)) {
      matchedTerms += 1;
      score += 12;
    }
  }

  for (const signal of redditSignals) {
    if (text.includes(signal)) score += 8;
  }

  if (
    text.includes("?") ||
    /\b(how|what|anyone|best|recommend)\b/.test(text)
  ) {
    score += 15;
  }

  if (matchedTerms === 0 && score < 40) {
    score = Math.min(score, 35);
  } else {
    score = Math.max(score, 40 + matchedTerms * 5);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    section: sectionFromScore(score),
    reason:
      matchedTerms > 0
        ? "Keyword and intent match"
        : "General Reddit engagement opportunity",
  };
}

export async function scorePostRelevance(input: {
  productPrompt: string;
  title: string;
  body: string;
}): Promise<RelevanceResult> {
  const fallback: RelevanceResult = {
    score: 0,
    section: "irrelevant",
    reason: "Scoring unavailable",
  };

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || !input.productPrompt.trim()) return fallback;

  try {
    const text = await callAnthropic({
      max_tokens: MAX_TOKENS_SCORING,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: `Score this Reddit post 0-100 based on relevance to this product context: ${input.productPrompt.slice(0, 800)}

Post title: ${input.title}
Post body: ${(input.body || "").slice(0, 600)}

Section thresholds:
- Reply (someone has exact problem product solves): 80-100
- Influence (vague interest, could mention product): 60-79
- Warmup (any engagement opportunity): 40-59
- Irrelevant: 0-39

Return ONLY this JSON, nothing else:
{
  "score": 85,
  "section": "reply",
  "reason": "User explicitly asks for nail visualization tool"
}`,
        },
      ],
    });

    const parsed = parseJsonBlock(text);
    if (!parsed) return fallback;

    const n = Number(parsed.score);
    const score = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
    const section = normalizeSection(parsed.section) === "irrelevant"
      ? sectionFromScore(score)
      : normalizeSection(parsed.section);

    return {
      score,
      section: section === "irrelevant" ? sectionFromScore(score) : section,
      reason: String(parsed.reason ?? ""),
    };
  } catch {
    return fallback;
  }
}
