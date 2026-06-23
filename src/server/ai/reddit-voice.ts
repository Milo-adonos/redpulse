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
  return "le site";
}

const FORBIDDEN_PATTERNS = [
  /^bonjour\b/i,
  /\bcordialement\b/i,
  /\bn'hésitez\b/i,
  /\bn'hésite pas à consulter\b/i,
  /\bje vous recommande\b/i,
  /\bje vous conseille\b/i,
  /\bnous vous\b/i,
  /\bveuillez\b/i,
  /\bvotre situation\b/i,
  /\bformidable\b/i,
  /\boutil formidable\b/i,
  /\bj'ai découvert un outil\b/i,
  /\btutoriel(s)? en ligne\b/i,
  /\bj'espère que cela\b/i,
  /\bexcellente question\b/i,
  /\bje comprends tout à fait\b/i,
  /\bhope this helps\b/i,
  /\bgreat question\b/i,
  /\bi'd recommend\b/i,
  /\bcheck out\b/i,
  /\bgame changer\b/i,
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

  const formalVous = /\b(vous|vos)\b/i.test(trimmed);
  const tutoiement = /\b(tu|ton|ta|tes|t'|toi)\b/i.test(trimmed);
  if (formalVous && !tutoiement) return true;

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
    "promo",
    "offre limitée",
    "incontournable",
    "révolutionnaire",
    "incroyable outil",
    "must have",
    "lien en bio",
  ];
  for (const word of promoWords) {
    if (lower.includes(word)) score += 0.12;
  }

  if (mentionProduct && text.length < 40) score += 0.08;
  if (text.length > 320) score += 0.06;

  return Math.min(1, Math.round(score * 100) / 100);
}

export function buildPersonaRules(subreddit: string): string {
  return `Tu écris UNIQUEMENT le texte du commentaire Reddit — rien d'autre.

PROFIL :
- Fille 18-25 ans, passionnée nail art / beauté
- Écrit depuis son tel, vite, naturellement
- Membre de r/${subreddit} depuis un moment
- Ton TikTok/Instagram, PAS assistant IA

RÈGLES STRICTES :
- Tutoiement uniquement, JAMAIS vouvoiement
- Pas de majuscule en début de phrase (ou rare)
- Ponctuation imparfaite ok
- Abréviations naturelles : jsp, mdr, ptdr, omg, ngl, tbh, fr, bah, ouais, nan, trop, grave, stylé
- Fautes légères ok : "trop bien", "ça donne", "j'adore", "c'est trop ça"
- PAS de tirets, PAS de listes, PAS de structure IA
- PAS de "bonjour", "cordialement", "n'hésitez pas", "je vous", "veuillez"
- 2-3 phrases max, courtes
- 1-2 emojis max : 💅🔥😭✨
- Parfois une question à la fin
- Français uniquement

INTERDIT :
"Bonjour ! Je comprends tout à fait votre situation..."
"N'hésitez pas à consulter des tutoriels..."
"Je vous recommande vivement..."
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
    return `La personne CHERCHE un site/app/outil. Réponds comme quelqu'un qui a trouvé un truc qui marche.
- Mentionne ${productLabel} ultra naturellement, ex: "j'ai testé ${productLabel} y'a genre 2 semaines et honnêtement c'est ouf"
- PAS "j'ai découvert un outil formidable", PAS de pitch`;
  }

  if (options.mentionProduct) {
    return `Tu peux glisser ${productLabel} naturellement si ça colle au post.
- Ex: "jsp j'ai trouvé ${productLabel} ya quelques semaines c'est trop bien pour s'inspirer 💅"
- Une seule mention max, zero pub`;
  }

  return `ZÉRO produit, ZÉRO marque, ZÉRO URL. Juste un conseil ou une expérience perso dans la niche.`;
}

export function buildWarmupRules(): string {
  return `WARMUP — zéro promo, zéro produit, zéro marque, zéro URL.
- Réagis comme une vraie fille de la commu : compliment, avis perso, question relou mais sympa
- Ex: "omg le chrome il est trop beau 😭 tu l'as fait comment ?"
- Ex: "nan mais grave stylé, j'adore la forme"`;
}
