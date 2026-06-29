import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { onboardingSessions } from "@/server/db/schema";
import { getStripe, getAppUrl } from "@/lib/stripe";
import { getStripePriceId, PLANS, type PlanId } from "@/lib/plans";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      plan?: PlanId;
      sessionId?: string;
    };

    const plan = body.plan;
    const sessionId = body.sessionId;

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "Session requise" }, { status: 400 });
    }

    const priceId = getStripePriceId(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe non configuré pour ce plan" },
        { status: 503 },
      );
    }

    if (!db) {
      return NextResponse.json({ error: "Base de données indisponible" }, { status: 503 });
    }

    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/onboarding/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboarding/pricing?session=${sessionId}`,
      metadata: {
        onboardingSessionId: sessionId,
        plan,
      },
    });

    await db
      .update(onboardingSessions)
      .set({ plan, stripeSessionId: checkout.id })
      .where(eq(onboardingSessions.id, sessionId));

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("[stripe checkout]", error);
    return NextResponse.json({ error: "Erreur Stripe" }, { status: 500 });
  }
}
