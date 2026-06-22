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
  const siteHint = input.siteUrl
    ? input.siteUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]
    : null;

  const mentionRule = mentionProduct
    ? `Softly connect the post to what ${productName} solves — like someone who actually uses it, NOT a founder pitching.
- Mention ${productName}${siteHint ? ` (${siteHint})` : ""} at most once, only if it fits naturally.
- Bridge from their situation to your experience: "we had the same thing / ended up using X for Y".
- Never drop a bare URL, never say "check out", "game changer", or "hope this helps".
- If the post is only loosely related, still add value first, then one casual mention of how you handle it.`
    : `Do NOT mention any product, brand, app name, or URL.
- Still be helpful in the niche: share a practical tip or relatable experience.
- This builds credibility before ever naming a tool.`;

  const systemPrompt = `You write Reddit comments for the REPLY workflow — finding ICP posts and joining the conversation like a real r/${input.subreddit} member who might eventually share what they use.

Rules:
- English only. ${tone} tone.
- 1-3 short sentences. Max 280 chars preferred.
- Match r/${input.subreddit} voice: casual, direct, contractions ok, sometimes lowercase.
- NO AI voice: no "great question", "I'd recommend checking out", bullet points, or em dashes.
- NO corporate/marketing speak.
${mentionRule}
- Output ONLY the comment text.`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Body: ${input.postBody.slice(0, 400)}` : ""}

What ${productName} does (for context only): ${input.productContext.slice(0, 300)}

Write one reply comment. ${mentionProduct ? "Include a natural, subtle mention of the product." : "Helpful only — no product mention."}`;

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY non configurée");
  }

  const systemPrompt = `You write Reddit comments for the WARMUP workflow — building karma and presence in r/${input.subreddit} WITHOUT promoting anything.

Rules:
- English only. Casual tone.
- 1-2 short sentences. Max 200 chars.
- React like a normal community member: agree, ask a follow-up, share a tiny personal take, compliment their work.
- NO product mentions, NO brand names, NO URLs, NO advice that sounds like you're selling something.
- NO AI voice: no "hope this helps", "great question", bullet points, or em dashes.
- Output ONLY the comment text.`;

  const userPrompt = `Subreddit: r/${input.subreddit}
Post: ${input.postTitle}
${input.postBody ? `Body: ${input.postBody.slice(0, 300)}` : ""}

Write a short, genuine warmup comment. Zero promotion.`;

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
        max_tokens: 150,
        temperature: 0.95,
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
    banRiskScore: computeBanRiskScore(body, false),
    model: usedModel,
  };
}
