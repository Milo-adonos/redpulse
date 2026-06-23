import {
  generateRedditReply,
  generateWarmupReply,
} from "@/server/ai/anthropic";
import { isMessageTooArtificial } from "@/server/ai/reddit-voice";

export type ResponseLanguage = "en";

export interface ReplyMessageInput {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  productContext: string;
  productName?: string;
  siteUrl?: string;
  mentionSite: boolean;
  seekingRecommendation?: boolean;
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
    .replace(/ — /g, ", ")
    .replace(/ – /g, ", ")
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
    "this site";

  const result = await generateRedditReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
    productContext: input.productContext,
    productName,
    siteUrl: input.siteUrl,
    mentionProduct: input.mentionSite,
    seekingRecommendation: input.seekingRecommendation,
    tone: "casual",
  });

  const body = cleanHumanText(result.body);
  if (isMessageTooArtificial(body)) {
    throw new Error("Message rejeté : ton trop artificiel");
  }

  return {
    body,
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

  const body = cleanHumanText(result.body);
  if (isMessageTooArtificial(body)) {
    throw new Error("Message rejeté : ton trop artificiel");
  }

  return {
    body,
    safetyScore: banRiskToSafetyScore(result.banRiskScore),
    model: result.model,
  };
}
