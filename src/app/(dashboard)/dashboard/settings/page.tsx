"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/data-list";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: settings, refetch } = api.settings.get.useQuery();
  const updateProject = api.settings.updateProject.useMutation({ onSuccess: showSaved });
  const updateFilters = api.settings.updateFilters.useMutation({ onSuccess: showSaved });
  const analyzeSite = api.settings.analyzeSite.useMutation({
    onSuccess: (data) => {
      setProjectName(data.title);
      setDescription(data.suggestedDescription);
      setKeywords(data.keywords);
      setSubreddits(data.subreddits);
      setNotice("Site ré-analysé — vérifiez les champs puis enregistrez.");
      setTimeout(() => setNotice(null), 4000);
    },
  });
  const rediscover = api.settings.rediscoverSubreddits.useMutation({
    onSuccess: (data) => {
      setSubreddits(data.subreddits);
      setNotice("Subreddits mis à jour selon votre ICP.");
      void refetch();
      setTimeout(() => setNotice(null), 4000);
    },
  });

  useEffect(() => {
    if (!settings) return;
    setProjectName(settings.projectName);
    setSiteUrl(settings.siteUrl);
    setDescription(settings.description);
    setKeywords(settings.keywords);
    setSubreddits(settings.subreddits);
  }, [settings]);

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateProject.mutate({
      name: projectName.trim() || "Mon projet",
      siteUrl: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
      description,
      keywords,
    });
    updateFilters.mutate({ keywords, subreddits });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Projet, ICP, subreddits — tout est modifiable pour votre compte."
      />

      {saved && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300/90">
          {ux.settings.saved}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-[13px] text-primary/90">
          {notice}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="max-w-2xl space-y-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
      >
        <div>
          <label className="text-[12px] text-white/50">Nom du projet</label>
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Mon SaaS"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">URL du site</label>
          <div className="mt-2 flex gap-2">
            <input
              type="url"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              placeholder="https://votreproduit.com"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
            />
            <button
              type="button"
              disabled={!siteUrl.trim() || analyzeSite.isLoading}
              onClick={() =>
                analyzeSite.mutate({
                  url: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
                })
              }
              className="shrink-0 rounded-xl border border-white/10 px-4 py-3 text-[12px] text-white/70 hover:border-primary/30 hover:text-white disabled:opacity-50"
            >
              {analyzeSite.isLoading ? "…" : "Ré-analyser"}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[12px] text-white/50">Brief produit (prompt IA)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            placeholder="Brief détaillé utilisé pour générer vos réponses Reddit…"
            className="mt-2 w-full resize-none rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm leading-relaxed text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-[12px] text-white/50">Subreddits ciblés</label>
            <button
              type="button"
              disabled={rediscover.isLoading}
              onClick={() => rediscover.mutate()}
              className="text-[11px] text-primary hover:text-primary/80 disabled:opacity-50"
            >
              {rediscover.isLoading ? "Découverte…" : "Redécouvrir auto"}
            </button>
          </div>
          <textarea
            value={subreddits.map((s) => `r/${s.replace(/^r\//, "")}`).join(", ")}
            onChange={(e) => setSubreddits(parseList(e.target.value))}
            rows={2}
            placeholder="r/SaaS, r/startups…"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Mots-clés ICP</label>
          <textarea
            value={keywords.join(", ")}
            onChange={(e) => setKeywords(parseList(e.target.value))}
            rows={2}
            placeholder="saas, marketing, automation…"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
        </div>

        <div>
          <label className="text-[12px] text-white/50">Langue des réponses</label>
          <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-[13px] text-white/80">
            English — all generated replies and warmup messages are written in English.
          </div>
        </div>

        <button
          type="submit"
          disabled={
            updateProject.isLoading ||
            updateFilters.isLoading ||
            !subreddits.length ||
            !keywords.length
          }
          className="rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-black hover:bg-white/90 disabled:opacity-50"
        >
          Enregistrer
        </button>
      </form>
    </div>
  );
}
