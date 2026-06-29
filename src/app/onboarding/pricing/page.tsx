"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { PricingCards } from "@/components/onboarding/pricing-cards";

function PricingContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  return (
    <OnboardingShell>
      <div className="w-full max-w-5xl">
        <div className="mb-10 text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-white">
            Choisissez votre plan
          </h1>
          <p className="mt-2 text-[16px] text-[#666666]">
            Commencez gratuitement, upgradez quand vous voulez
          </p>
        </div>
        <PricingCards sessionId={sessionId ?? undefined} />
      </div>
    </OnboardingShell>
  );
}

export default function OnboardingPricingPage() {
  return (
    <Suspense
      fallback={
        <OnboardingShell>
          <p className="text-white/40">Chargement…</p>
        </OnboardingShell>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
