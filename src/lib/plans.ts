export type PlanId = "starter" | "growth" | "pro";

export const PLAN_MESSAGE_QUOTAS: Record<PlanId, number> = {
  starter: 200,
  growth: 400,
  pro: 2000,
};

export const PLANS: Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    price: number;
    subtitle: string;
    monthlyMessageQuota: number;
    features: string[];
    popular?: boolean;
    envKey: string;
  }
> = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 29,
    subtitle: "Pour tester Reddit comme canal",
    monthlyMessageQuota: PLAN_MESSAGE_QUOTAS.starter,
    envKey: "STRIPE_PRICE_STARTER",
    features: [
      "1 projet",
      "5 subreddits trackés",
      "200 messages générés/mois",
      "Reply + Warmup + Influence",
      "Dashboard analytics",
      "Subreddit Voice Analysis",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    price: 49,
    subtitle: "Pour scaler votre acquisition Reddit",
    monthlyMessageQuota: PLAN_MESSAGE_QUOTAS.growth,
    popular: true,
    envKey: "STRIPE_PRICE_GROWTH",
    features: [
      "Tout Starter, plus :",
      "3 projets",
      "8 subreddits trackés",
      "400 messages générés/mois",
      "Competitor tracking",
      "Support prioritaire",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 89,
    subtitle: "Pour les équipes sérieuses",
    monthlyMessageQuota: PLAN_MESSAGE_QUOTAS.pro,
    envKey: "STRIPE_PRICE_PRO",
    features: [
      "Tout Growth, plus :",
      "Projets illimités",
      "Subreddits illimités",
      "2000 messages générés/mois",
      "Team members",
      "Account Health Score",
    ],
  },
};

export function getPlanMessageQuota(plan: PlanId): number {
  return PLAN_MESSAGE_QUOTAS[plan];
}

export function getStripePriceId(plan: PlanId): string | null {
  const id = process.env[PLANS[plan].envKey];
  return id && id.length > 0 ? id : null;
}

export function planToTeamPlan(plan: PlanId): PlanId {
  return plan;
}
