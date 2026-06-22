import {
  generateRedditReply,
  generateWarmupReply,
} from "@/server/ai/anthropic";

export type ResponseLanguage = "en";

export interface ReplyMessageInput {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  productContext: string;
  productName?: string;
  siteUrl?: string;
  mentionSite: boolean;
  language?: ResponseLanguage;
}

function banRiskToSafetyScore(banRiskScore: number): number {
  const raw = Math.round((1 - banRiskScore) * 10);
  return Math.max(8, Math.min(10, raw));
}

function cleanHumanText(body: string): string {
  return body
    .replace(/^[-•*]\s+/gm, "")
    .replace(/\n[-•*]\s+/g, "\n")
    .replace(/\*\*/g, "")
    .trim();
}

export async function generateReplyMessage(input: ReplyMessageInput) {
  const productName =
    input.productName?.trim() ||
    input.siteUrl
      ?.replace(/^https?:\/\/(www\.)?/, "")
      .split("/")[0]
      ?.replace(/\.(app|com|io|co|net|org)$/i, "")
      .split(".")[0] ||
    "the tool";

  const result = await generateRedditReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
    productContext: input.productContext,
    productName,
    siteUrl: input.siteUrl,
    mentionProduct: input.mentionSite,
    tone: "casual",
  });

  return {
    body: cleanHumanText(result.body),
    safetyScore: banRiskToSafetyScore(result.banRiskScore),
    model: result.model,
  };
}

export async function generateWarmupMessage(input: {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  language?: ResponseLanguage;
}) {
  const result = await generateWarmupReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
  });

  return {
    body: cleanHumanText(result.body),
    safetyScore: banRiskToSafetyScore(result.banRiskScore),
    model: result.model,
  };
}
