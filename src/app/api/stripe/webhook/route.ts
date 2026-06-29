import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/server/db";
import { onboardingSessions } from "@/server/db/schema";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("[stripe webhook] signature:", error);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    const onboardingSessionId = checkoutSession.metadata?.onboardingSessionId;
    const plan = checkoutSession.metadata?.plan;

    if (db && onboardingSessionId) {
      await db
        .update(onboardingSessions)
        .set({
          paid: true,
          stripeSessionId: checkoutSession.id,
          plan: plan ?? undefined,
        })
        .where(eq(onboardingSessions.id, onboardingSessionId));
    }
  }

  return NextResponse.json({ received: true });
}
