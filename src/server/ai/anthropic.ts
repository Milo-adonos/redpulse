const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL_CANDIDATES = [
  process.env.ANTHROPIC_MODEL,
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-6",
  "claude-opus-4-8",
].filter(Boolean) as string[];

export type ReplyTone = "helpful" | "casual" | "technical";

export interface GenerateReplyInput {
  postTitle: string;
  postBody?: string;
  subreddit: string;
  productContext: string;
  mentionProduct?: boolean;
  tone?: ReplyTone;
}

export interface GenerateReplyResult {
  body: string;
  banRiskScore: number;
  model: string;
}

function computeBanRiskScore(text: string, mentionProduct: boolean): number {
  let score = 0.1;
  const urlCount = (text.match(/https?:\/\//g) ?? []).length;
  if (urlCount > 1) score += 0.3;
  if (urlCount === 1) score += 0.1;

  const promoWords = [
    "buy now",
    "discount",
    "limited offer",
    "check out our",
    "best tool ever",
  ];
  const lower = text.toLowerCase();
  for (const word of promoWords) {
    if (lower.includes(word)) score += 0.15;
  }

  if (mentionProduct && text.length < 80) score += 0.1;
  if (text.length > 400) score += 0.05;

  return Math.min(1, Math.round(score * 100) / 100);
}

export async function generateRedditReply(
  input: GenerateReplyInput,
): Promise<GenerateReplyResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

  const tone = input.tone ?? "helpful";
  const mentionProduct = input.mentionProduct ?? true;

  const systemPrompt = `Tu es un expert Reddit qui rédige des commentaires authentiques et utiles.
Règles strictes:
- Ton ${tone}, naturel, jamais spammy
- Maximum 280 caractères si possible, jamais plus de 400
- Pas plus d'un lien URL
- Évite le langage promotionnel agressif
- ${mentionProduct ? `Mentionne subtilement le produit: ${input.productContext}` : "Ne mentionne aucun produit"}
- Réponds uniquement avec le texte du commentaire, sans guillemets ni préambule`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Titre du post: ${input.postTitle}
${input.postBody ? `Contenu: ${input.postBody}` : ""}

Rédige un commentaire pertinent et humain.`;

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
        max_tokens: 300,
        temperature: 0.7,
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

  return {
    body,
    banRiskScore: computeBanRiskScore(body, mentionProduct),
    model: usedModel,
  };
}

export async function generateWarmupReply(input: {
  postTitle: string;
  subreddit: string;
  postBody?: string;
}): Promise<GenerateReplyResult> {
  return generateRedditReply({
    postTitle: input.postTitle,
    postBody: input.postBody,
    subreddit: input.subreddit,
    productContext: "general discussion",
    mentionProduct: false,
    tone: "casual",
  });
}
