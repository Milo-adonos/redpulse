import {
  buildPersonaRules,
  buildReplyMentionRules,
  buildWarmupRules,
  computeAuthenticityBanRisk,
  formatProductLabel,
  isMessageTooArtificial,
} from "@/server/ai/reddit-voice";
import { callAnthropic, ANTHROPIC_MODEL } from "@/server/ai/client";
import { MAX_TOKENS_MESSAGE } from "@/server/ai/constants";

export type ReplyTone = "helpful" | "casual" | "technical";

export interface GenerateReplyInput {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  productContext: string;
  productName?: string;
  siteUrl?: string;
  mentionProduct?: boolean;
  seekingRecommendation?: boolean;
  tone?: ReplyTone;
}

export interface GenerateReplyResult {
  body: string;
  banRiskScore: number;
  model: string;
}

const MAX_GENERATION_ATTEMPTS = 3;

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<{ body: string; model: string }> {
  const body = await callAnthropic({
    max_tokens: MAX_TOKENS_MESSAGE,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  return { body, model: ANTHROPIC_MODEL };
}

export async function generateRedditReply(
  input: GenerateReplyInput,
): Promise<GenerateReplyResult> {
  const mentionProduct = input.mentionProduct ?? true;
  const seekingRecommendation = input.seekingRecommendation ?? false;
  const productLabel = formatProductLabel(input.productName, input.siteUrl);

  const systemPrompt = `${buildPersonaRules(input.subreddit)}

${buildReplyMentionRules(productLabel, { mentionProduct, seekingRecommendation })}

Examples:
"omg same issue 😭 tried random stuff, good gel top coat helped fr"
"ngl found a site for nail designs few weeks ago lowkey perfect"`;

  const userPrompt = `r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Body: ${input.postBody.slice(0, 300)}` : ""}

Context: ${input.productContext.slice(0, 200)}

${
    seekingRecommendation
      ? "They want tool/site — mention product naturally."
      : mentionProduct
        ? "Mention product if sounds real."
        : "No product mention."
  }`;

  let lastResult: GenerateReplyResult | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const temperature = 0.92 + attempt * 0.04;
    const { body, model } = await callClaude(systemPrompt, userPrompt, temperature);
    const banRiskScore = computeAuthenticityBanRisk(body, mentionProduct);

    lastResult = { body, banRiskScore, model };

    if (!isMessageTooArtificial(body) && banRiskScore <= 0.25) {
      return lastResult;
    }
  }

  if (!lastResult || isMessageTooArtificial(lastResult.body)) {
    throw new Error("Message généré trop artificiel — réessayez");
  }

  return lastResult;
}

export async function generateWarmupReply(input: {
  postTitle: string;
  subreddit: string;
  postBody?: string;
}): Promise<GenerateReplyResult> {
  const systemPrompt = `${buildPersonaRules(input.subreddit)}

${buildWarmupRules()}

Examples:
"no bc this shape is literally perfect 💅"
"omg so pretty 😭 what color?"`;

  const userPrompt = `r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Body: ${input.postBody.slice(0, 200)}` : ""}

Short warmup comment. Zero promo.`;

  let lastResult: GenerateReplyResult | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const temperature = 0.94 + attempt * 0.03;
    const { body, model } = await callClaude(systemPrompt, userPrompt, temperature);
    const banRiskScore = computeAuthenticityBanRisk(body, false);

    lastResult = { body, banRiskScore, model };

    if (!isMessageTooArtificial(body) && banRiskScore <= 0.2) {
      return lastResult;
    }
  }

  if (!lastResult || isMessageTooArtificial(lastResult.body)) {
    throw new Error("Message warmup trop artificiel — réessayez");
  }

  return lastResult;
}

export { computeAuthenticityBanRisk, isMessageTooArtificial } from "@/server/ai/reddit-voice";
