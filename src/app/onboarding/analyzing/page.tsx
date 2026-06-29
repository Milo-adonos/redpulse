"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Suspense } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";

const STEPS = [
  "Lecture de la landing page...",
  "Analyse du produit avec Claude...",
  "Identification des subreddits...",
  "Analyse des concurrents...",
];

function AnalyzingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startScrape = api.onboarding.startScrape.useMutation({
    onError: (e) => setError(e.message),
  });

  const runAnalysis = api.onboarding.runAnalysis.useMutation({
    onSuccess: (data) => {
      try {
        localStorage.setItem("redpulse:onboarding-session", data.id);
      } catch {
        // ignore
      }
    },
    onError: (e) => setError(e.message),
  });

  const domain = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  }, [url]);

  useEffect(() => {
    if (!url) {
      setError("URL manquante");
      return;
    }

    const storageKey = `redpulse:analyzing:${url}`;
    let storedSessionId: string | null = null;
    try {
      storedSessionId = sessionStorage.getItem(storageKey);
    } catch {
      // ignore
    }

    if (storedSessionId) {
      setSessionId(storedSessionId);
      setActiveStep(1);
      if (!runAnalysis.isSuccess && !runAnalysis.isPending) {
        runAnalysis.mutate({ sessionId: storedSessionId });
      }
      return;
    }

    if (startScrape.isSuccess || startScrape.isPending) return;
    startScrape.mutate({ url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!startScrape.data || sessionId) return;
    try {
      sessionStorage.setItem(
        `redpulse:analyzing:${url}`,
        startScrape.data.sessionId,
      );
    } catch {
      // ignore
    }
    setSessionId(startScrape.data.sessionId);
    setActiveStep(1);
    runAnalysis.mutate({ sessionId: startScrape.data.sessionId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startScrape.data]);

  useEffect(() => {
    if (activeStep < 1) return;
    if (runAnalysis.isPending && activeStep < 2) {
      setActiveStep(2);
    }
  }, [runAnalysis.isPending, activeStep]);

  useEffect(() => {
    if (!runAnalysis.isSuccess) return;
    setActiveStep(3);
    const t1 = setTimeout(() => setActiveStep(4), 400);
    const t2 = setTimeout(() => {
      router.replace(`/onboarding/result?session=${runAnalysis.data!.id}`);
    }, 900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [runAnalysis.isSuccess, runAnalysis.data, router]);

  const favicon = url
    ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=64`
    : null;

  return (
    <OnboardingShell>
      <div className="w-full max-w-[480px] rounded-xl border border-[#1a1a1a] bg-[#111111] p-10">
        <div className="flex items-center gap-3 border-b border-[#1a1a1a] pb-5">
          {favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="h-10 w-10 rounded-lg" />
          )}
          <div className="min-w-0">
            <p className="truncate text-[18px] font-semibold text-white">
              {domain || "…"}
            </p>
            <p className="truncate text-[13px] text-[#666666]">{url}</p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {STEPS.map((label, index) => {
            const stepNum = index + 1;
            const done = activeStep > stepNum || (activeStep === stepNum && runAnalysis.isSuccess);
            const current =
              activeStep === stepNum ||
              (stepNum === 1 && startScrape.isPending) ||
              (stepNum === 2 && runAnalysis.isPending && activeStep >= 2);
            const waiting = !done && !current;

            return (
              <div
                key={label}
                className={cn(
                  "flex items-center gap-3 text-[14px] transition-colors duration-150 ease-in-out",
                  done ? "text-white" : current ? "text-white/80" : "text-[#666666]",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4 shrink-0 text-[#f97316]" />
                ) : current ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#f97316]" />
                ) : (
                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#444444]" />
                )}
                {label}
                {waiting && stepNum > activeStep + 1 ? null : null}
              </div>
            );
          })}
        </div>

        {error && (
          <p className="mt-6 text-center text-[13px] text-red-400">{error}</p>
        )}
      </div>
    </OnboardingShell>
  );
}

export default function AnalyzingPage() {
  return (
    <Suspense
      fallback={
        <OnboardingShell>
          <div className="text-[#666666]">Chargement…</div>
        </OnboardingShell>
      }
    >
      <AnalyzingContent />
    </Suspense>
  );
}
