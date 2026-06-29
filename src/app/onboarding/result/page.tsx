"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-[12px] text-white">
      {children}
    </span>
  );
}

function CompetitorPill({ domain }: { domain: string }) {
  const favicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-[12px] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={favicon} alt="" className="h-4 w-4 rounded-sm" />
      {domain}
    </span>
  );
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId =
    searchParams.get("session") ??
    (typeof window !== "undefined"
      ? localStorage.getItem("redpulse:onboarding-session")
      : null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = api.onboarding.getSession.useQuery(
    { id: sessionId! },
    { enabled: !!sessionId },
  );

  const saveDetails = api.onboarding.saveAccountDetails.useMutation();

  useEffect(() => {
    if (!data) return;
    if (data.firstName) setFirstName(data.firstName);
    if (data.lastName) setLastName(data.lastName);
    if (data.email) setEmail(data.email);
  }, [data]);

  async function handleContinue() {
    setFormError("");
    if (!sessionId) return;

    if (!firstName.trim() || !lastName.trim()) {
      setFormError("Entrez votre prénom et nom");
      return;
    }
    if (!email.trim()) {
      setFormError("Entrez votre email");
      return;
    }
    if (password.length < 8) {
      setFormError("Mot de passe : 8 caractères minimum");
      return;
    }

    try {
      await saveDetails.mutateAsync({
        id: sessionId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      try {
        sessionStorage.setItem("redpulse:onboarding-password", password);
      } catch {
        // ignore
      }
      router.push(`/onboarding/pricing?session=${sessionId}`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (!sessionId) {
    return (
      <OnboardingShell>
        <p className="text-[#666666]">Session introuvable.</p>
        <Link href="/" className="mt-4 text-[#f97316]">
          Retour à l&apos;accueil
        </Link>
      </OnboardingShell>
    );
  }

  if (isLoading || !data) {
    return (
      <OnboardingShell>
        <p className="text-[#666666]">Chargement…</p>
      </OnboardingShell>
    );
  }

  if (error) {
    return (
      <OnboardingShell>
        <p className="text-red-400">{error.message}</p>
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      <div className="w-full max-w-[560px] rounded-xl border border-[#1a1a1a] bg-[#111111] p-10">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.favicon} alt="" className="h-10 w-10 rounded-lg" />
          <div>
            <p className="text-[18px] font-semibold text-[#f97316]">
              {data.productName}
            </p>
            <p className="text-[14px] text-[#666666]">
              Voici ce que RedPulse a compris
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">
              Produit
            </p>
            <p className="mt-2 text-[14px] italic text-[#888888]">
              {data.productPrompt}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">
              Subreddits
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.suggestedSubreddits.map((sub) => (
                <Pill key={sub}>r/{sub.replace(/^r\//i, "")}</Pill>
              ))}
            </div>
          </div>

          {data.competitors.length > 0 && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">
                Concurrents
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.competitors.map((c) => (
                  <CompetitorPill key={c} domain={c} />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#666666]">
              Mots-clés
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.suggestedKeywords.map((kw) => (
                <Pill key={kw}>{kw}</Pill>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[13px] text-white/70">Votre prénom et nom</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="rounded-md border border-[#222222] bg-[#0c0c0c] px-[14px] py-[10px] text-[14px] text-white outline-none transition-[border-color] duration-150 ease-in-out focus:border-[#f97316]"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="rounded-md border border-[#222222] bg-[#0c0c0c] px-[14px] py-[10px] text-[14px] text-white outline-none transition-[border-color] duration-150 ease-in-out focus:border-[#f97316]"
              />
            </div>
          </div>

          <div>
            <label className="text-[13px] text-white/70">Votre email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-[14px] py-[10px] text-[14px] text-white outline-none transition-[border-color] duration-150 ease-in-out focus:border-[#f97316]"
            />
          </div>

          <div>
            <label className="text-[13px] text-white/70">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              className="mt-2 w-full rounded-md border border-[#222222] bg-[#0c0c0c] px-[14px] py-[10px] text-[14px] text-white outline-none transition-[border-color] duration-150 ease-in-out focus:border-[#f97316]"
            />
          </div>

          {formError && <p className="text-[13px] text-red-400">{formError}</p>}

          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={saveDetails.isPending}
            className="w-full rounded-lg bg-[#f97316] px-4 py-4 text-[15px] font-medium text-white transition-colors duration-150 ease-in-out hover:bg-[#ea6c0a] disabled:opacity-50"
          >
            {saveDetails.isPending ? "Enregistrement…" : "Continuer →"}
          </button>
        </div>
      </div>
    </OnboardingShell>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <OnboardingShell>
          <p className="text-[#666666]">Chargement…</p>
        </OnboardingShell>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
