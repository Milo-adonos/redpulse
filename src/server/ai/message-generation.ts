import {
  generateRedditReply,
  generateWarmupReply,
} from "@/server/ai/anthropic";

export type ResponseLanguage = "fr" | "en";

export interface ReplyMessageInput {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  productContext: string;
  siteUrl?: string;
  mentionSite: boolean;
  language: ResponseLanguage;
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
  const langNote =
    input.language === "en"
      ? "Write in English."
      : "Écris en français naturel.";

  const mentionNote = input.mentionSite
    ? `Tu peux mentionner le site ou le produit (${input.siteUrl ?? input.productContext}) de façon légère.`
    : `Ne donne pas le nom du produit ni d'URL. Dis plutôt que tu as trouvé un outil qui fait ça.`;

  const result = await generateRedditReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
    productContext: `${input.productContext}. ${langNote} ${mentionNote} Pas de tirets, pas de listes, pas de formatage IA. Écris comme un humain sur Reddit.`,
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
  language: ResponseLanguage;
}) {
  const langNote =
    input.language === "en"
      ? "Write in English."
      : "Écris en français naturel.";

  const result = await generateWarmupReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
  });

  return {
    body: cleanHumanText(
      `${result.body} ${langNote} Apporte de la valeur, pose une question ou partage une expérience. Aucune mention de produit.`,
    ).slice(0, 500),
    safetyScore: banRiskToSafetyScore(result.banRiskScore),
    model: result.model,
  };
}
