"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { api } from "@/trpc/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stripeSessionId = searchParams.get("session_id");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { data: session, isLoading } = api.onboarding.getByStripeSession.useQuery(
    { stripeSessionId: stripeSessionId! },
    { enabled: !!stripeSessionId },
  );

  const signup = api.auth.signup.useMutation({
    onSuccess: async (result) => {
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError("Compte créé — connectez-vous manuellement");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!session?.id) {
      setError("Session invalide");
      return;
    }
    if (!session.paid) {
      setError("Paiement non confirmé — réessayez dans quelques instants");
      return;
    }
    signup.mutate({
      name: session.projectName ?? session.productName ?? "Founder",
      email,
      password,
      onboardingSessionId: session.id,
    });
  }

  if (!stripeSessionId) {
    return (
      <OnboardingShell>
        <p className="text-white/50">Session de paiement introuvable.</p>
        <Link href="/onboarding/pricing" className="mt-4 text-[#f97316]">
          Retour aux plans
        </Link>
      </OnboardingShell>
    );
  }

  if (isLoading || !session) {
    return (
      <OnboardingShell>
        <p className="text-white/40">Vérification du paiement…</p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      <div className="w-full max-w-[420px] rounded-xl border border-[#222222] bg-[#111111] p-10">
        <h1 className="text-[24px] font-semibold text-white">Créer votre compte</h1>
        <p className="mt-2 text-[14px] text-white/45">
          Plan {session.plan ?? "Starter"} activé — dernière étape
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-[13px] text-white/50">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-4 py-3 text-[14px] text-white outline-none focus:border-[#f97316]"
            />
          </div>
          <div>
            <label className="text-[13px] text-white/50">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[#222222] bg-[#0c0c0c] px-4 py-3 text-[14px] text-white outline-none focus:border-[#f97316]"
            />
          </div>

          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={signup.isPending}
            className="w-full rounded-lg bg-[#f97316] px-4 py-4 text-[15px] font-medium text-white hover:bg-[#ea6c0a] disabled:opacity-50"
          >
            {signup.isPending ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </OnboardingShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <OnboardingShell>
          <p className="text-white/40">Chargement…</p>
        </OnboardingShell>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
