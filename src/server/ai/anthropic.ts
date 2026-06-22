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
    "hope this helps",
    "game changer",
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

  const tone = input.tone ?? "casual";
  const mentionProduct = input.mentionProduct ?? true;
  const productName = input.productName ?? "the product";

  const systemPrompt = `You write Reddit comments that sound 100% human — indistinguishable from a real r/${input.subreddit} user.

Rules:
- English only. ${tone} tone.
- 1-3 short sentences. Max 280 chars preferred.
- Match how people actually talk on r/${input.subreddit}: casual, direct, sometimes lowercase, contractions ok.
- NO AI voice: never say "hope this helps", "great question", "I'd recommend checking out", "happy to share", bullet points, or em dashes.
- NO corporate/marketing speak.
- ${mentionProduct ? `You can naturally mention ${productName} once if relevant — like a user sharing something that worked, not an ad.` : "Do not mention any product, brand, or URL."}
- Output ONLY the comment text.`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Body: ${input.postBody.slice(0, 400)}` : ""}

Context about what you might mention: ${input.productContext.slice(0, 300)}

Write one comment like a real community member.`;

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
        max_tokens: 200,
        temperature: 0.9,
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
    productContext: "share a genuine thought or question",
    mentionProduct: false,
    tone: "casual",
  });
}
