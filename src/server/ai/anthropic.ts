import {
  buildPersonaRules,
  buildReplyMentionRules,
  buildWarmupRules,
  computeAuthenticityBanRisk,
  formatProductLabel,
  isMessageTooArtificial,
} from "@/server/ai/reddit-voice";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL_CANDIDATES = [
  process.env.ANTHROPIC_MODEL,
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
].filter(Boolean) as string[];

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
  maxTokens: number,
  temperature: number,
): Promise<{ body: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

  let lastError = "";
  let data: { content: Array<{ type: string; text?: string }> } | null = null;
  let usedModel = MODEL_CANDIDATES[0] ?? "claude-haiku-4-5-20251001";

  for (const model of MODEL_CANDIDATES.length ? MODEL_CANDIDATES : ["claude-haiku-4-5-20251001"]) {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (response.ok) {
      data = await response.json();
      usedModel = model;
      break;
    }

    lastError = await response.text();
    if (response.status !== 404) {
      throw new Error(`Anthropic API error (${response.status}): ${lastError}`);
    }
  }

  if (!data) {
    throw new Error(`Anthropic API error: aucun modèle disponible. ${lastError}`);
  }

  const body =
    data.content.find((block) => block.type === "text")?.text?.trim() ?? "";

  if (!body) {
    throw new Error("Réponse vide de Claude");
  }

  return { body, model: usedModel };
}

export async function generateRedditReply(
  input: GenerateReplyInput,
): Promise<GenerateReplyResult> {
  const mentionProduct = input.mentionProduct ?? true;
  const seekingRecommendation = input.seekingRecommendation ?? false;
  const productLabel = formatProductLabel(input.productName, input.siteUrl);

  const systemPrompt = `${buildPersonaRules(input.subreddit)}

${buildReplyMentionRules(productLabel, { mentionProduct, seekingRecommendation })}

BONS EXEMPLES :
"omg j'ai eu exactement le même problème 😭 j'ai fini par tester des trucs au hasard et finalement le gel top coat ça change tout fr, t'as essayé ?"
"jsp si c'est pour tous les niveaux mais j'ai trouvé un site qui génère des designs ya quelques semaines et c'est trop bien pour s'inspirer 💅"`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Contenu: ${input.postBody.slice(0, 400)}` : ""}

Contexte produit (ne pas recopier mot pour mot): ${input.productContext.slice(0, 300)}

Écris UN commentaire prêt à poster. ${
    seekingRecommendation
      ? "La personne cherche un outil/site — mentionne le produit naturellement."
      : mentionProduct
        ? "Tu peux mentionner le produit si ça sonne vrai."
        : "Aucune mention produit."
  }`;

  let lastResult: GenerateReplyResult | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const temperature = 0.92 + attempt * 0.04;
    const { body, model } = await callClaude(systemPrompt, userPrompt, 180, temperature);
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

BONS EXEMPLES :
"nan mais grave stylé j'adore la forme 💅"
"omg trop beau 😭 c'est quoi la couleur ?"`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Contenu: ${input.postBody.slice(0, 300)}` : ""}

Écris UN commentaire warmup court. Zéro promo.`;

  let lastResult: GenerateReplyResult | null = null;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const temperature = 0.94 + attempt * 0.03;
    const { body, model } = await callClaude(systemPrompt, userPrompt, 140, temperature);
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

// Re-export for routers that validate generated text
export { computeAuthenticityBanRisk, isMessageTooArtificial } from "@/server/ai/reddit-voice";
