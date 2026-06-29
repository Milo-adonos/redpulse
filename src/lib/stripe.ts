import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      apiVersion: "2026-06-24.dahlia",
    });
  }
  return stripeClient;
}

export function getAppUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}
