import { isMessageTooArtificial } from "@/server/ai/reddit-voice";
import { callAnthropic } from "@/server/ai/client";
import { MAX_TOKENS_MESSAGE } from "@/server/ai/constants";
import type { SubredditVoiceProfile } from "@/server/db/schema";
import { buildVoicePromptSection } from "@/server/reddit/subreddit-voice";

export type MessageSection = "reply" | "warmup" | "influence" | "post";

export type GeneratedSectionMessage = {
  message: string;
  banScore: number;
  banReason: string;
  containsUrl?: boolean;
  title?: string;
  body?: string;
  suggestedSubreddit?: string;
  styleConfidence?: number;
  hasVoiceProfile?: boolean;
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

async function callClaude(
  system: string,
  user: string,
): Promise<string> {
  return callAnthropic({
    max_tokens: MAX_TOKENS_MESSAGE,
    temperature: 0.85,
    system,
    messages: [{ role: "user", content: user }],
  });
}

export async function generateSectionMessage(input: {
  section: MessageSection;
  productName: string;
  productUrl: string;
  productPrompt: string;
  niche: string;
  subreddit: string;
  postTitle: string;
  postBody?: string;
  subreddits?: string[];
  voiceProfile?: SubredditVoiceProfile | null;
}): Promise<GeneratedSectionMessage> {
  const body = input.postBody?.slice(0, 500) ?? "";
  const voiceBlock = input.voiceProfile
    ? `\n\n${buildVoicePromptSection(input.subreddit, input.voiceProfile)}`
    : "";
  let system = "";
  let user = "";

  switch (input.section) {
    case "reply":
      system = `You are a real person who discovered ${input.productName} a few weeks ago by chance.
Product context: ${input.productPrompt.slice(0, 600)}`;
      user = `Reddit post in r/${input.subreddit}:
Title: ${input.postTitle}
Content: ${body}

Write a natural reply that:
- Shows empathy in 1 line max
- Shares you had the same problem
- Mentions ${input.productName} as a casual recent discovery
- Only includes URL ${input.productUrl} if feels natural
- Ends naturally, zero CTA

STRICT RULES - if broken, reply is worthless:
- Write like a real 18-25yo girl texting from her phone
- Zero dashes, zero bullet points, zero AI structure
- Max 3 short sentences
- Natural abbrevs: ngl, tbh, fr, idk, omg only if justified
- 1 emoji max, only if natural
- Zero: 'hello', 'regards', 'I recommend', 'feel free'
- Never start with 'I'
- Must pass: would a real person write this?

Return ONLY this JSON:
{
  "message": "...",
  "ban_score": 9,
  "ban_reason": "...",
  "contains_url": true
}${voiceBlock}`;
      break;

    case "warmup":
      system =
        "You are a real passionate person in this community. You have nothing to sell.";
      user = `Reddit post in r/${input.subreddit}:
Title: ${input.postTitle}
Content: ${body}

Write a natural comment that:
- Genuinely responds to the post
- Adds real value (tip, experience, question)
- Ends with a question to create engagement
- Mentions NOTHING product-related, zero

STRICT RULES:
- Sound exactly like subreddit regulars
- Zero dashes, zero lists
- 1-3 lines maximum
- Natural English abbrevs
- 0-1 emoji max
- Ban score target: 10/10

Return ONLY this JSON:
{
  "message": "...",
  "ban_score": 10,
  "ban_reason": "..."
}${voiceBlock}`;
      break;

    case "influence":
      system =
        "You are a real person who found a great tool but you're not going to mention it directly. You want people to ask you about it.";
      user = `Reddit post in r/${input.subreddit}:
Title: ${input.postTitle}
Content: ${body}

Write a reply that:
- Responds authentically to the post first
- Hints you found something useful without naming it
- Makes people curious enough to ask what it is

Natural phrasing to use:
'i actually found something that helps with exactly that but idk if it works for everyone'
'been using something for this for a few weeks and it genuinely changed things ngl'
'there's this thing i stumbled on recently that does exactly that?? still lowkey obsessed'

STRICT RULES:
- NEVER give name or URL in this message
- Stay vague but intriguing
- Max 2 lines
- Ban score target: 10/10

Return ONLY this JSON:
{
  "message": "...",
  "ban_score": 10,
  "ban_reason": "..."
}${voiceBlock}`;
      break;

    case "post":
      system = "You create authentic Reddit posts. Never mention any product.";
      user = `Create an authentic Reddit post for r/${input.subreddit}. Niche: ${input.niche}.
Return ONLY this JSON: {"titre":"...","corps":"...","ban_score":10,"subreddit_suggere":"r/...","ban_reason":"..."}`;
      break;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await callClaude(system, user);
    const parsed = parseJsonBlock(raw);
    if (!parsed) continue;

    if (input.section === "post") {
      const title = String(parsed.titre ?? parsed.title ?? "");
      const postBody = String(parsed.corps ?? parsed.body ?? "");
      const combined = `${title}\n\n${postBody}`;
      if (!title || isMessageTooArtificial(combined)) continue;
      return {
        message: combined,
        title,
        body: postBody,
        banScore: Number(parsed.ban_score) || 10,
        banReason: String(parsed.ban_reason ?? "natural tone"),
        suggestedSubreddit: String(
          parsed.subreddit_suggere ?? parsed.subreddit_suggested ?? input.subreddit,
        ),
      };
    }

    const message = String(parsed.message ?? "");
    if (!message || isMessageTooArtificial(message)) continue;

    return {
      message,
      banScore: Number(parsed.ban_score) || 9,
      banReason: String(parsed.ban_reason ?? "natural tone"),
      containsUrl: Boolean(parsed.contains_url),
      hasVoiceProfile: !!input.voiceProfile,
    };
  }

  throw new Error("Message généré trop artificiel — réessayez");
}
