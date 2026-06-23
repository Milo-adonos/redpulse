export function formatSiteHint(siteUrl?: string | null): string | null {
  if (!siteUrl) return null;
  return siteUrl
    .replace(/^https?:\/\/(www\.)?/i, "")
    .split("/")[0]
    ?.toLowerCase() ?? null;
}

export function formatProductLabel(
  productName?: string | null,
  siteUrl?: string | null,
): string {
  const site = formatSiteHint(siteUrl);
  if (site) return site;
  if (productName?.trim()) return productName.trim().toLowerCase();
  return "this site";
}

const FORBIDDEN_PATTERNS = [
  /^hello\b/i,
  /^hi there\b/i,
  /\bdear\b/i,
  /\bkind regards\b/i,
  /\bbest regards\b/i,
  /\bhope this helps\b/i,
  /\bgreat question\b/i,
  /\bi'd recommend checking out\b/i,
  /\bi would recommend\b/i,
  /\bplease feel free\b/i,
  /\bdon't hesitate to\b/i,
  /\bi understand your situation\b/i,
  /\bexcellent question\b/i,
  /\bcheck out our\b/i,
  /\bgame changer\b/i,
  /\brevolutionary tool\b/i,
  /\bamazing tool\b/i,
  /\bformidable\b/i,
  /\bj'ai\b/i,
  /\bc'est\b/i,
  /\bt'as\b/i,
  /\bn'hésitez\b/i,
  /\bcordialement\b/i,
  /^-\s/m,
  /^\d+\.\s/m,
  /\n-\s/,
  / — /,
  / – /,
];

export function isMessageTooArtificial(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 380) return true;

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  const sentences = trimmed.split(/[.!?]+/).filter(Boolean);
  if (sentences.length > 4) return true;

  return false;
}

export function computeAuthenticityBanRisk(
  text: string,
  mentionProduct: boolean,
): number {
  let score = 0.08;
  const lower = text.toLowerCase();

  if (isMessageTooArtificial(text)) score += 0.55;

  const urlCount = (text.match(/https?:\/\//g) ?? []).length;
  if (urlCount > 1) score += 0.25;
  if (urlCount === 1) score += 0.08;

  const promoWords = [
    "buy now",
    "limited offer",
    "must have",
    "link in bio",
    "discount",
    "check out",
    "highly recommend",
  ];
  for (const word of promoWords) {
    if (lower.includes(word)) score += 0.12;
  }

  if (mentionProduct && text.length < 40) score += 0.08;
  if (text.length > 320) score += 0.06;

  return Math.min(1, Math.round(score * 100) / 100);
}

export function buildPersonaRules(subreddit: string): string {
  return `You write ONLY the Reddit comment text — nothing else.

PERSONA:
- Girl, 18-25, obsessed with nail art / beauty
- Typing from her phone, fast and natural
- Been in r/${subreddit} for a while
- TikTok/Instagram voice, NOT an AI assistant

STRICT RULES:
- English only
- Casual, lowercase vibe (caps ok for emphasis sometimes)
- Imperfect punctuation is fine
- Natural slang: omg, ngl, tbh, fr, lowkey, literally, honestly, kinda, idk, lol, lmao, slay, obsessed, so good, deadass
- Light typos ok: "its", "ur", "u", "rn", "bc", "w/", "gonna", "wanna"
- NO dashes, NO bullet lists, NO AI structure
- NO "hello", "hope this helps", "great question", "I'd recommend checking out", "please feel free"
- 2-3 short sentences max
- 1-2 emojis max: 💅🔥😭✨
- Sometimes end with a question to engage

FORBIDDEN:
"Hello! I completely understand your situation..."
"Please feel free to check out online tutorials..."
"I highly recommend that you..."
"- Point 1 / - Point 2"`;
}

export function buildReplyMentionRules(
  productLabel: string,
  options: {
    mentionProduct: boolean;
    seekingRecommendation: boolean;
  },
): string {
  if (options.seekingRecommendation) {
    return `They're actively looking for an app/site/tool. Reply like someone who found something that actually works.
- Mention ${productLabel} super naturally, e.g. "i tried ${productLabel} like 2 weeks ago and honestly its been so good for previewing designs"
- NOT "I discovered an amazing tool", NO sales pitch`;
  }

  if (options.mentionProduct) {
    return `You can slip in ${productLabel} naturally if it fits the post.
- e.g. "ngl i found ${productLabel} a few weeks ago and its lowkey perfect for getting inspo 💅"
- One mention max, zero ad vibes`;
  }

  return `ZERO product, ZERO brand names, ZERO URLs. Just a helpful tip or personal experience in the niche.`;
}

export function buildWarmupRules(): string {
  return `WARMUP — zero promo, zero product, zero brand, zero URL.
- React like a real community girl: compliment, hot take, casual question
- e.g. "omg the chrome is so clean 😭 how did u get it like that?"
- e.g. "no bc this shape is literally perfect 💅"`;
}
