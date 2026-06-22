const STOP_WORDS = new Set([
  "about", "also", "avec", "being", "customer", "customers", "description",
  "english", "founders", "from", "growth", "https", "into", "marketing",
  "mention", "natural", "naturally", "other", "platform", "product", "products",
  "project", "reddit", "saas", "sentence", "software", "solution", "startup",
  "startups", "target", "their", "this", "through", "tool", "tools", "using",
  "value", "website", "without", "your", "preview", "virtual", "photorealistic",
]);

export const GENERIC_BUSINESS_SUBREDDITS = new Set([
  "saas", "startups", "startup", "marketing", "entrepreneur", "entrepreneurship",
  "growth", "indiehackers", "digitalmarketing", "socialmedia", "b2b",
]);

const NICHE_SUBREDDIT_RULES: Array<{ pattern: RegExp; subs: string[] }> = [
  {
    pattern: /nail|manicure|pedicure|salon|beauty|cosmet|makeup|gel nail|acrylic/i,
    subs: [
      "Nails",
      "NailArt",
      "RedNails",
      "NailsDoneByReddit",
      "beauty",
      "SalonOwners",
      "smallbusiness",
      "FemaleOwnedBusiness",
    ],
  },
  {
    pattern: /fitness|gym|workout|exercise/i,
    subs: ["fitness", "GymMotivation", "bodyweightfitness", "running"],
  },
  {
    pattern: /food|restaurant|recipe|cook|chef/i,
    subs: ["restaurateur", "KitchenConfidential", "foodtrucks", "smallbusiness"],
  },
  {
    pattern: /real estate|property|rent|landlord/i,
    subs: ["realestateinvesting", "Landlord", "RealEstate"],
  },
  {
    pattern: /dev tool|developer tool|api|sdk|github/i,
    subs: ["SaaS", "startups", "SideProject", "webdev", "programming"],
  },
];

export type SubredditDiscoveryInput = {
  keywords: string[];
  productName?: string | null;
  description?: string | null;
  seedSubreddits?: string[];
  limit?: number;
  fast?: boolean;
};

function cleanSubredditName(name: string): string {
  return name.trim().replace(/^r\//i, "");
}

export function sanitizeKeywords(keywords: string[]): string[] {
  return [
    ...new Set(
      keywords
        .map((k) => k.toLowerCase().trim())
        .filter((kw) => kw.length > 2 && !STOP_WORDS.has(kw)),
    ),
  ];
}

export function expandKeywords(keywords: string[], ...texts: string[]): string[] {
  const expanded: string[] = [];
  for (const kw of keywords) {
    expanded.push(kw);
    for (const word of kw.split(/[\s,/]+/)) {
      if (word.length > 3) expanded.push(word.toLowerCase());
    }
  }
  for (const text of texts) {
    expanded.push(
      ...text
        .toLowerCase()
        .replace(/[^\w\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  }
  return sanitizeKeywords(expanded).slice(0, 20);
}

export function inferSubredditsFromText(text: string, limit = 10): string[] {
  for (const rule of NICHE_SUBREDDIT_RULES) {
    if (rule.pattern.test(text)) {
      return rule.subs.slice(0, limit);
    }
  }
  return [];
}

export function finalizeSubredditList(input: {
  aiSuggestions?: string[];
  inferred?: string[];
  keywords?: string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? 10;
  const keywords = sanitizeKeywords(input.keywords ?? []);
  const inferred = (input.inferred ?? []).map(cleanSubredditName).filter(Boolean);
  const isNiche =
    inferred.length >= 3 ||
    keywords.some(
      (kw) => !GENERIC_BUSINESS_SUBREDDITS.has(kw) && kw.length > 3,
    );
  const aiFiltered = (input.aiSuggestions ?? [])
    .map(cleanSubredditName)
    .filter(
      (sub) =>
        sub &&
        (!isNiche || !GENERIC_BUSINESS_SUBREDDITS.has(sub.toLowerCase())),
    );

  if (isNiche && inferred.length >= 3) {
    return [...new Set([...inferred, ...aiFiltered])].slice(0, limit);
  }

  const unique = [...new Set([...aiFiltered, ...inferred])];
  if (unique.length >= 3) return unique.slice(0, limit);

  return [...new Set([...unique, ...inferred])].slice(0, limit);
}

export async function discoverSubredditsForProduct(
  input: SubredditDiscoveryInput,
): Promise<string[]> {
  const limit = input.limit ?? 10;
  const text = [
    input.productName ?? "",
    input.description ?? "",
    ...(input.keywords ?? []),
  ].join(" ");

  const inferred = inferSubredditsFromText(text, limit);
  const fromSeeds = finalizeSubredditList({
    aiSuggestions: input.seedSubreddits,
    inferred,
    keywords: input.keywords,
    limit,
  });

  if (fromSeeds.length >= 3 || input.fast) {
    return fromSeeds.length ? fromSeeds : inferred.slice(0, limit);
  }

  return inferred.length ? inferred : ["smallbusiness"];
}

export async function discoverTargetSubreddits(
  keywords: string[],
  limit = 8,
): Promise<string[]> {
  return discoverSubredditsForProduct({ keywords, limit, fast: true });
}
