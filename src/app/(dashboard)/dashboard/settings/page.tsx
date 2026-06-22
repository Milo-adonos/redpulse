"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/data-list";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [siteUrl, setSiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const { data: settings } = api.settings.get.useQuery();
  const updateProject = api.settings.updateProject.useMutation({ onSuccess: showSaved });
  const updateFilters = api.settings.updateFilters.useMutation({ onSuccess: showSaved });
  const updateLanguage = api.settings.updateLanguage.useMutation({ onSuccess: showSaved });

  useEffect(() => {
    if (!settings) return;
    setSiteUrl(settings.siteUrl);
    setDescription(settings.description);
    setSubreddits(settings.subreddits.map((s) => `r/${s.replace(/^r\//, "")}`));
    setKeywords(settings.keywords);
    setLanguage(settings.responseLanguage);
  }, [settings]);

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProject.mutate({
      siteUrl: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
      description,
    });
    updateFilters.mutate({ subreddits, keywords });
    updateLanguage.mutate({ responseLanguage: language });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="URL du site, ciblage Reddit et langue des réponses générées."
      />

      {saved && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300/90">
          {ux.settings.saved}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="max-w-2xl space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
      >
        <div>
          <label className="text-[12px] text-white/50">URL du site</label>
          <input
            type="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://votreproduit.com"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Description du produit</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Décrivez votre produit en quelques mots…"
            className="mt-2 w-full resize-none rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Subreddits ciblés</label>
          <textarea
            value={subreddits.join(", ")}
            onChange={(e) =>
              setSubreddits(
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
            rows={2}
            placeholder="r/SaaS, r/startups…"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Mots-clés</label>
          <textarea
            value={keywords.join(", ")}
            onChange={(e) =>
              setKeywords(
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
            rows={2}
            placeholder="saas, marketing, automation…"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Langue des réponses générées</label>
          <div className="mt-2 flex gap-3">
            {(["fr", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  "flex-1 rounded-xl border py-3 text-[13px] transition-all",
                  language === lang
                    ? "border-primary/40 bg-primary/10 text-white"
                    : "border-white/[0.06] text-white/40 hover:text-white/70",
                )}
              >
                {lang === "fr" ? "Français" : "English"}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={
            updateProject.isLoading || updateFilters.isLoading || updateLanguage.isLoading
          }
          className="rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
