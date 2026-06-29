"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassPanel } from "./glass-panel";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";

type Step = "site" | "project" | "team";

const STEP_INDEX: Record<Step, number> = {
  site: 0,
  project: 1,
  team: 2,
};

const STEP_LABELS = ["Produit", "Projet", "Team"];

const DRAFT_STORAGE_KEY = "redpulse:onboarding-draft";

type OnboardingDraft = {
  url: string;
  projectName: string;
  productPrompt: string;
  description: string;
  keywords: string[];
  subreddits: string[];
  invites: string[];
};

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}

function parseEmails(value: string): string[] {
  return [...new Set(value.split(/[,;\n]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function saveDraftToStorage(draft: OnboardingDraft) {
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

function loadDraftFromStorage(): Partial<OnboardingDraft> | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<OnboardingDraft>;
  } catch {
    return null;
  }
}

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("site");
  const [url, setUrl] = useState("");
  const [projectName, setProjectName] = useState("");
  const [productPrompt, setProductPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = loadDraftFromStorage();
    if (!saved) return;
    if (saved.url) setUrl(saved.url);
    if (saved.projectName) setProjectName(saved.projectName);
    if (saved.productPrompt) setProductPrompt(saved.productPrompt);
    if (saved.description) setDescription(saved.description);
    if (saved.keywords?.length) setKeywords(saved.keywords);
    if (saved.subreddits?.length) setSubreddits(saved.subreddits);
    if (saved.invites?.length) setInvites(saved.invites);
    if (saved.productPrompt && !saved.projectName) setStep("site");
    else if (saved.projectName && !saved.invites?.length) setStep("project");
    else if (saved.projectName) setStep("team");
  }, []);

  useEffect(() => {
    if (!url && !projectName && !productPrompt) return;
    saveDraftToStorage({
      url,
      projectName,
      productPrompt,
      description,
      keywords,
      subreddits,
      invites,
    });
  }, [url, projectName, productPrompt, description, keywords, subreddits, invites]);

  const analyzeSite = api.project.analyzeSite.useMutation({
    onSuccess: (data) => {
      setError("");
      setProjectName(data.title);
      setProductPrompt(data.productPrompt ?? data.suggestedDescription);
      setDescription(data.suggestedDescription);
      setKeywords(data.keywords);
      setSubreddits(data.subreddits.slice(0, 10));
      setUrl(data.url);
    },
    onError: (e) => setError(e.message),
  });

  const createDraft = api.project.createDraft.useMutation({
    onSuccess: (data) => {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.setItem("redpulse:draft-token", data.draftToken);
      localStorage.setItem("redpulse:project-draft", JSON.stringify(data));
      router.push(
        `/signup?draft=${encodeURIComponent(data.draftToken)}&from=onboarding`,
      );
    },
    onError: (e) => {
      setError(
        e.message.includes("Invalid")
          ? "Impossible d'enregistrer le projet. Vérifiez l'URL et réessayez."
          : e.message,
      );
    },
  });

  const currentIndex = STEP_INDEX[step];

  function analyzeAndContinue() {
    setError("");
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Indiquez l'URL de votre site.");
      return;
    }
    setUrl(normalized);
    analyzeSite.mutate({ url: normalized });
  }

  function validatePrompt() {
    setError("");
    if (!productPrompt.trim()) {
      setError("Le product prompt est requis.");
      return;
    }
    setStep("project");
  }

  function continueToTeam() {
    setError("");
    if (!projectName.trim()) {
      setError("Indiquez un nom de projet.");
      return;
    }
    setStep("team");
  }

  function createAccount() {
    setError("");
    const siteUrl = normalizeUrl(url);
    if (!siteUrl) {
      setError("URL du site manquante. Retournez à l'étape 1.");
      setStep("site");
      return;
    }
    if (!projectName.trim() || !productPrompt.trim()) {
      setError("Nom du projet et product prompt requis.");
      return;
    }

    createDraft.mutate({
      projectName: projectName.trim(),
      siteUrl,
      description: productPrompt.trim(),
      productPrompt: productPrompt.trim(),
      keywords,
      subreddits: subreddits.slice(0, 10),
      invites,
    });
  }

  return (
    <section id="start" className="relative scroll-mt-24 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary">
          Prise en main · 3 étapes
        </p>
        <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl">
          {step === "site" && "Collez l'URL de votre produit"}
          {step === "project" && "Nommez votre projet"}
          {step === "team" && "Invitez votre équipe"}
        </h2>
        <p className="mt-3 text-sm text-white/40">
          {step === "site" &&
            "Collez votre URL. Claude analyse la landing page et génère un product prompt modifiable."}
          {step === "project" && "Comment appelez-vous ce projet ?"}
          {step === "team" &&
            "Invitez des collaborateurs par email. Accès immédiat ou en attente à la création du compte."}
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-xl px-5 sm:px-8">
        <GlassPanel className="p-6 sm:p-8">
          <div className="mb-8 flex justify-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "h-1 w-12 rounded-full transition-colors duration-300 sm:w-14",
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
            {step === "site" && (
              <motion.div
                key="site"
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

                {productPrompt ? (
                  <>
                    <label className="block text-left text-[11px] text-white/40">
                      Product prompt (injecté dans tous les messages)
                    </label>
                    <textarea
                      value={productPrompt}
                      onChange={(e) => setProductPrompt(e.target.value)}
                      rows={10}
                      className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-primary/40"
                    />
                  </>
                ) : (
                  <p className="text-[11px] text-white/30">
                    Scraping du site + product prompt IA (ICP, mots-clés, subreddits).
                  </p>
                )}

                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}

                {!productPrompt ? (
                  <button
                    type="button"
                    onClick={analyzeAndContinue}
                    disabled={analyzeSite.isLoading}
                    className="w-full rounded-full bg-white py-4 text-[14px] font-semibold text-black transition-all hover:bg-white/90 disabled:opacity-60"
                  >
                    {analyzeSite.isLoading ? "Analyse en cours…" : "Analyser"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={validatePrompt}
                    className="w-full rounded-full bg-white py-4 text-[14px] font-semibold text-black transition-all hover:bg-white/90"
                  >
                    Valider ce prompt
                  </button>
                )}
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
                  placeholder="Comment appelez-vous ce projet ?"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/40"
                />
                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("site")}
                    className="flex-1 rounded-full border border-white/10 py-3 text-[13px] text-white/70 hover:text-white"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={continueToTeam}
                    disabled={!projectName.trim()}
                    className="flex-1 rounded-full bg-primary py-3 text-[13px] font-semibold text-white hover:bg-primary/90 disabled:opacity-40"
                  >
                    Continuer →
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
                <textarea
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  rows={3}
                  placeholder="email1@exemple.com, email2@exemple.com"
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseEmails(inviteInput);
                    if (parsed.length) {
                      setInvites((prev) => [...new Set([...prev, ...parsed])]);
                      setInviteInput("");
                    }
                  }}
                  className="text-[12px] text-primary hover:text-primary/80"
                >
                  + Ajouter les emails
                </button>
                {invites.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {invites.map((email) => (
                      <span
                        key={email}
                        className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60"
                      >
                        {email}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-white/30">
                  Pas d&apos;email envoyé. Les invitations sont enregistrées en base uniquement.
                </p>
                {error && (
                  <p className="text-center text-sm text-red-400">{error}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("project")}
                    className="flex-1 rounded-full border border-white/10 py-3 text-[13px] text-white/70 hover:text-white"
                  >
                    ← Retour
                  </button>
                  <button
                    type="button"
                    onClick={createAccount}
                    disabled={createDraft.isLoading}
                    className="flex-1 rounded-full bg-primary py-3 text-[13px] font-semibold text-white hover:bg-primary/90 disabled:opacity-40"
                  >
                    {createDraft.isLoading ? "Préparation…" : "Créer mon projet"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>
      </div>
    </section>
  );
}
