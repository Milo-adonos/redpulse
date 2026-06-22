"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { GlassPanel } from "./glass-panel";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";

type Step = "product" | "project" | "team";

const STEP_INDEX: Record<Step, number> = {
  product: 0,
  project: 1,
  team: 2,
};

export function OnboardingFlow() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>("product");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [invites, setInvites] = useState("");
  const [error, setError] = useState("");

  const createDraft = api.project.createDraft.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("redpulse:draft-token", data.draftToken);
      localStorage.setItem("redpulse:project-draft", JSON.stringify(data));
      if (session?.user) {
        router.replace("/dashboard");
        return;
      }
      router.replace(
        `/signup?draft=${encodeURIComponent(data.draftToken)}&from=onboarding`,
      );
    },
    onError: (e) => setError(e.message),
  });

  const currentIndex = STEP_INDEX[step];

  function continueFromProduct() {
    setError("");
    if (!url.trim()) {
      setError("Indiquez l'URL de votre site.");
      return;
    }
    if (!projectName.trim()) {
      const host = url.replace(/^https?:\/\//, "").split("/")[0] ?? "Mon projet";
      setProjectName(host.split(".")[0] ?? "Mon projet");
    }
    setStep("project");
  }

  return (
    <section id="start" className="relative scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Prise en main · 3 étapes
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
          {step === "product" && "Votre produit"}
          {step === "project" && ux.onboarding.projectTitle}
          {step === "team" && ux.onboarding.teamTitle}
        </h2>
      </div>

      <div className="mx-auto mt-12 max-w-xl px-5 sm:px-8">
        <GlassPanel className="p-6 sm:p-8">
          <div className="mb-8 flex justify-center gap-2">
              {ux.onboarding.steps.map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "h-1 w-14 rounded-full transition-colors duration-300",
                      i <= currentIndex ? "bg-primary" : "bg-white/10",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wider",
                      i <= currentIndex ? "text-primary/80" : "text-white/25",
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

          <AnimatePresence mode="wait">
            {step === "product" && (
              <motion.div
                key="product"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={ux.onboarding.placeholders.url}
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-4 text-center text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Décrivez votre produit en quelques mots (optionnel)"
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-white/25 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-white/30">{ux.hints.url}</p>
                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}
                <button
                  type="button"
                  onClick={continueFromProduct}
                  className="w-full rounded-full bg-white py-4 text-[14px] font-semibold text-black transition-all hover:bg-white/90"
                >
                  {ux.cta.continue} →
                </button>
              </motion.div>
            )}

            {step === "project" && (
              <motion.div
                key="project"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={ux.onboarding.placeholders.projectName}
                  autoFocus
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-white/30">Nom affiché dans RedPulse</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("product")}
                    className="flex-1 rounded-full border border-white/10 py-3 text-[13px] text-white/70 hover:text-white"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("team")}
                    disabled={!projectName.trim()}
                    className="flex-1 rounded-full bg-white py-3 text-[13px] font-semibold text-black hover:bg-white/90 disabled:opacity-40"
                  >
                    {ux.cta.continue} →
                  </button>
                </div>
              </motion.div>
            )}

            {step === "team" && (
              <motion.div
                key="team"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                <input
                  value={invites}
                  onChange={(e) => setInvites(e.target.value)}
                  placeholder={ux.onboarding.placeholders.invites}
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-[11px] text-white/30">
                  Accès immédiat si le compte existe, sinon en attente à l&apos;inscription.
                </p>
                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}
                <button
                  type="button"
                  disabled={createDraft.isLoading}
                  onClick={() =>
                    createDraft.mutate({
                      projectName: projectName.trim() || "Mon projet",
                      siteUrl: url.startsWith("http") ? url : `https://${url}`,
                      description: description.trim(),
                      invites: invites
                        .split(",")
                        .map((e) => e.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-full bg-primary py-4 text-[14px] font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-60"
                >
                  {createDraft.isLoading ? "Création…" : "Continuer →"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>
      </div>
    </section>
  );
}
