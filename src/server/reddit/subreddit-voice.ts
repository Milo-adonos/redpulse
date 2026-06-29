import { and, eq } from "drizzle-orm";
import type { Database } from "@/server/db";
import {
  projects,
  subredditVoices,
  type SubredditVoiceProfile,
} from "@/server/db/schema";
import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_VOICE_ANALYSIS } from "@/server/ai/constants";
import { fetchSubredditTopComments } from "@/server/reddit/reddit-json";

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

function normalizeProfile(raw: Record<string, unknown>): SubredditVoiceProfile {
  return {
    tone: String(raw.tone ?? ""),
    avg_length: String(raw.avg_length ?? raw.avgLength ?? ""),
    common_abbreviations: asStringArray(
      raw.common_abbreviations ?? raw.commonAbbreviations,
    ),
    common_expressions: asStringArray(
      raw.common_expressions ?? raw.commonExpressions,
    ),
    emoji_usage: String(raw.emoji_usage ?? raw.emojiUsage ?? ""),
    typical_emojis: asStringArray(raw.typical_emojis ?? raw.typicalEmojis),
    capitalization: String(raw.capitalization ?? ""),
    punctuation_style: String(raw.punctuation_style ?? raw.punctuationStyle ?? ""),
    greeting_style: String(raw.greeting_style ?? raw.greetingStyle ?? ""),
    question_style: String(raw.question_style ?? raw.questionStyle ?? ""),
    typical_openers: asStringArray(raw.typical_openers ?? raw.typicalOpeners),
    things_to_avoid: asStringArray(raw.things_to_avoid ?? raw.thingsToAvoid),
    example_authentic_comment: String(
      raw.example_authentic_comment ?? raw.exampleAuthenticComment ?? "",
    ),
  };
}

export function computeStyleConfidence(
  profile: SubredditVoiceProfile | null,
  sampleSize: number,
): number {
  if (!profile) return 1;
  let score = Math.min(10, Math.max(1, Math.round(sampleSize / 5)));
  if (!profile.tone) score -= 2;
  if (!profile.example_authentic_comment) score -= 1;
  if (!profile.typical_openers?.length) score -= 1;
  return Math.max(1, Math.min(10, score));
}

export function buildVoicePromptSection(
  subreddit: string,
  profile: SubredditVoiceProfile,
): string {
  const clean = subreddit.replace(/^r\//i, "");
  return `CRITICAL - Writing style for r/${clean}:
Tone: ${profile.tone ?? "casual"}
Average length: ${profile.avg_length ?? "short (1 line)"}
Common abbreviations used by this community: ${(profile.common_abbreviations ?? []).join(", ") || "none noted"}
Common expressions: ${(profile.common_expressions ?? []).join(", ") || "none noted"}
Emoji usage: ${profile.emoji_usage ?? "rare"} - typical: ${(profile.typical_emojis ?? []).join(" ") || "none"}
Capitalization style: ${profile.capitalization ?? "normal"}
Punctuation style: ${profile.punctuation_style ?? "minimal"}
Typical openers: ${(profile.typical_openers ?? []).join(", ") || "none noted"}
NEVER do: ${(profile.things_to_avoid ?? []).join(", ") || "formal language, bullet points"}

Your message MUST be indistinguishable from a real r/${clean} comment.
If someone reads it alongside real comments from this subreddit, they should not be able to tell which one is AI-generated.
Match the style EXACTLY. Not approximately. EXACTLY.`;
}

async function analyzeCommentsWithClaude(
  subreddit: string,
  comments: { body: string; score: number }[],
): Promise<SubredditVoiceProfile | null> {
  if (comments.length < 5) return null;

  const clean = subreddit.replace(/^r\//i, "");
  const commentsText = comments
    .slice(0, 50)
    .map((c, i) => `${i + 1}. [↑${c.score}] ${c.body.slice(0, 280)}`)
    .join("\n");

  try {
    const text = await callAnthropic({
      max_tokens: MAX_TOKENS_VOICE_ANALYSIS,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: `Analyze these real comments from r/${clean} and extract the community's writing style profile.

Comments:
${commentsText}

Extract and return ONLY this JSON:
{
  "tone": "casual/enthusiastic/technical/supportive...",
  "avg_length": "very short (1-5 words) / short (1 line) / medium (2-3 lines)",
  "common_abbreviations": ["ngl", "omg", "fr", "lowkey"],
  "common_expressions": ["obsessed with", "this is giving"],
  "emoji_usage": "none / rare (1 per 5 messages) / moderate / frequent",
  "typical_emojis": ["💅", "😭", "✨"],
  "capitalization": "none / normal / random caps for emphasis",
  "punctuation_style": "minimal / normal / excessive!!!",
  "greeting_style": "none / hey / omg hi",
  "question_style": "ends with ?? / just ? / no punctuation",
  "typical_openers": ["omg", "wait", "okay but"],
  "things_to_avoid": ["formal language", "bullet points", "long paragraphs"],
  "example_authentic_comment": "a short example in this exact style"
}`,
        },
      ],
    });

    const parsed = parseJsonBlock(text);
    if (!parsed) return null;
    return normalizeProfile(parsed);
  } catch {
    return null;
  }
}

export async function getProjectIdForTeam(
  db: Database,
  teamId: string,
): Promise<string | null> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.teamId, teamId),
    columns: { id: true },
  });
  return project?.id ?? null;
}

export async function getSubredditVoice(
  db: Database,
  projectId: string,
  subreddit: string,
) {
  const clean = subreddit.replace(/^r\//i, "").toLowerCase();
  return db.query.subredditVoices.findFirst({
    where: and(
      eq(subredditVoices.projectId, projectId),
      eq(subredditVoices.subreddit, clean),
    ),
  });
}

export async function analyzeSubredditVoice(
  db: Database,
  projectId: string,
  subreddit: string,
  options?: { force?: boolean },
): Promise<{
  profile: SubredditVoiceProfile;
  sampleSize: number;
  analyzedAt: Date;
  styleConfidence: number;
} | null> {
  const clean = subreddit.replace(/^r\//i, "").toLowerCase();

  if (!options?.force) {
    const existing = await getSubredditVoice(db, projectId, clean);
    if (existing) {
      return {
        profile: existing.voiceProfile,
        sampleSize: existing.sampleSize,
        analyzedAt: existing.analyzedAt,
        styleConfidence: computeStyleConfidence(
          existing.voiceProfile,
          existing.sampleSize,
        ),
      };
    }
  }

  const comments = await fetchSubredditTopComments(clean, 50);
  if (comments.length < 5) return null;

  const profile = await analyzeCommentsWithClaude(clean, comments);
  if (!profile) return null;

  const sampleSize = comments.length;
  const analyzedAt = new Date();

  await db
    .insert(subredditVoices)
    .values({
      projectId,
      subreddit: clean,
      voiceProfile: profile,
      sampleSize,
      analyzedAt,
    })
    .onConflictDoUpdate({
      target: [subredditVoices.projectId, subredditVoices.subreddit],
      set: {
        voiceProfile: profile,
        sampleSize,
        analyzedAt,
      },
    });

  return {
    profile,
    sampleSize,
    analyzedAt,
    styleConfidence: computeStyleConfidence(profile, sampleSize),
  };
}

/** Analyze voice for subreddits missing a profile — called after initial scrape. */
export async function ensureSubredditVoicesForTeam(
  db: Database,
  teamId: string,
  subreddits: string[],
) {
  const projectId = await getProjectIdForTeam(db, teamId);
  if (!projectId) return { analyzed: 0 };

  let analyzed = 0;
  for (const sub of subreddits) {
    const existing = await getSubredditVoice(db, projectId, sub);
    if (existing) continue;
    const result = await analyzeSubredditVoice(db, projectId, sub);
    if (result) analyzed++;
  }
  return { analyzed };
}

export async function listSubredditVoicesForTeam(
  db: Database,
  teamId: string,
  subreddits: string[],
) {
  const projectId = await getProjectIdForTeam(db, teamId);
  if (!projectId) {
    return subreddits.map((sub) => ({
      subreddit: sub.replace(/^r\//i, ""),
      analyzed: false as const,
      profile: null,
      sampleSize: 0,
      analyzedAt: null as Date | null,
      styleConfidence: 0,
    }));
  }

  const voices = await db.query.subredditVoices.findMany({
    where: eq(subredditVoices.projectId, projectId),
  });
  const voiceMap = new Map(voices.map((v) => [v.subreddit.toLowerCase(), v]));

  return subreddits.map((raw) => {
    const subreddit = raw.replace(/^r\//i, "").toLowerCase();
    const voice = voiceMap.get(subreddit);
    if (!voice) {
      return {
        subreddit,
        analyzed: false as const,
        profile: null,
        sampleSize: 0,
        analyzedAt: null as Date | null,
        styleConfidence: 0,
      };
    }
    return {
      subreddit,
      analyzed: true as const,
      profile: voice.voiceProfile,
      sampleSize: voice.sampleSize,
      analyzedAt: voice.analyzedAt,
      styleConfidence: computeStyleConfidence(
        voice.voiceProfile,
        voice.sampleSize,
      ),
    };
  });
}
