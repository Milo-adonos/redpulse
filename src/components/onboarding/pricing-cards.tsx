"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, type PlanId } from "@/lib/plans";
import { api } from "@/trpc/react";

export function PricingCards({
  sessionId,
  compact = false,
}: {
  sessionId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [error, setError] = useState("");

  const complete = api.onboarding.completeOnboarding.useMutation();

  async function selectPlan(plan: PlanId) {
    if (!sessionId) {
      window.location.href = "/#hero";
      return;
    }

    let password = "";
    try {
      password = sessionStorage.getItem("redpulse:onboarding-password") ?? "";
    } catch {
      // ignore
    }

    if (!password || password.length < 8) {
      setError("Retournez à l'étape précédente pour définir votre mot de passe");
      return;
    }

    setLoading(plan);
    setError("");

    try {
      const result = await complete.mutateAsync({
        sessionId,
        plan,
        password,
      });

      try {
        sessionStorage.removeItem("redpulse:onboarding-password");
        localStorage.removeItem("redpulse:onboarding-session");
      } catch {
        // ignore
      }

      const signInResult = await signIn("credentials", {
        email: result.email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Compte créé — connectez-vous manuellement");
        setLoading(null);
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création du compte");
      setLoading(null);
    }
  }

  return (
    <div className={compact ? "space-y-4" : ""}>
      <div className="mx-auto grid max-w-[900px] gap-4 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((planId) => {
          const plan = PLANS[planId];
          const isPopular = plan.popular;

          return (
            <div
              key={planId}
              className={cn(
                "relative flex flex-col rounded-xl bg-[#111111] p-7",
                isPopular
                  ? "border-2 border-[#f97316]"
                  : "border border-[#1a1a1a]",
              )}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f97316] px-3 py-1 text-[12px] font-medium text-white">
                  Populaire
                </span>
              )}
              <div>
                <h3 className="text-[16px] font-semibold uppercase tracking-wide text-white">
                  {plan.name}
                </h3>
                <p className="mt-3">
                  <span className="text-[40px] font-bold text-white">${plan.price}</span>
                  <span className="text-[16px] text-[#666666]">/mois</span>
                </p>
                <p className="mt-2 text-[14px] text-[#666666]">{plan.subtitle}</p>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-white/80"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#f97316]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => void selectPlan(planId)}
                disabled={loading !== null}
                className={cn(
                  "mt-6 w-full rounded-lg px-4 py-[14px] text-[14px] font-medium transition-colors duration-150 ease-in-out disabled:opacity-50",
                  isPopular
                    ? "bg-[#f97316] text-white hover:bg-[#ea6c0a]"
                    : "border border-[#2a2a2a] bg-[#1a1a1a] text-white hover:bg-[#222222]",
                )}
              >
                {loading === planId
                  ? "Création du compte…"
                  : `Choisir ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {error && <p className="mt-4 text-center text-[13px] text-red-400">{error}</p>}
      {!compact && (
        <p className="mt-8 text-center text-[13px] text-[#555555]">
          Annulation à tout moment · Paiement sécurisé · Sans engagement
        </p>
      )}
    </div>
  );
}
