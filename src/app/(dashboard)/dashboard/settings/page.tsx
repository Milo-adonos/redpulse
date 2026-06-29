"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/data-list";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";

type SettingsSection = "brand" | "discovery" | "competitors";

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: "brand", label: "Brand" },
  { id: "discovery", label: "Discovery" },
  { id: "competitors", label: "Competitors" },
];

const DISCOVERY_MODES = [
  { id: "safe" as const, label: "Safe", hint: "Mentions subtiles, ban risk low", risk: "Low" },
  { id: "balanced" as const, label: "Balanced", hint: "Mix éducatif/promo, ban risk medium", risk: "Medium" },
  { id: "aggressive" as const, label: "Aggressive", hint: "Exposition max, ban risk high", risk: "High" },
];

const inputClass =
  "w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30";

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
}

function riskBadgeClass(risk: string) {
  if (risk === "Low") return "bg-emerald-500/15 text-emerald-300";
  if (risk === "Medium") return "bg-amber-500/15 text-amber-300";
  return "bg-red-500/15 text-red-300";
}

export default function SettingsPage() {
  const [section, setSection] = useState<SettingsSection>("brand");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [productPrompt, setProductPrompt] = useState("");
  const [industry, setIndustry] = useState("");
  const [redditProfileUrl, setRedditProfileUrl] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [subreddits, setSubreddits] = useState<string[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [postsPerDay, setPostsPerDay] = useState(25);
  const [sinceDate, setSinceDate] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");

  const { data: settings } = api.settings.get.useQuery();
  const { data: subredditScores = [] } = api.settings.getSubredditScores.useQuery(undefined, {
    enabled: section === "discovery",
  });
  const { data: subredditVoices = [] } = api.settings.getSubredditVoices.useQuery(
    undefined,
    {
      enabled: section === "discovery",
      refetchInterval: section === "discovery" ? 15_000 : false,
    },
  );
  const { data: competitors = [], refetch: refetchCompetitors } =
    api.settings.listCompetitors.useQuery(undefined, { enabled: section === "competitors" });

  const updateProject = api.settings.updateProject.useMutation({ onSuccess: showSaved });
  const updateFilters = api.settings.updateFilters.useMutation({ onSuccess: showSaved });
  const updateDiscovery = api.settings.updateDiscovery.useMutation({ onSuccess: showSaved });
  const addCompetitor = api.settings.addCompetitor.useMutation({
    onSuccess: () => {
      setCompetitorUrl("");
      void refetchCompetitors();
    },
  });
  const removeCompetitor = api.settings.removeCompetitor.useMutation({
    onSuccess: () => void refetchCompetitors(),
  });
  const analyzeSite = api.settings.analyzeSite.useMutation({
    onSuccess: (data) => {
      setProjectName(data.title);
      setProductPrompt(data.productPrompt ?? data.suggestedDescription);
      setKeywords(data.keywords);
      setSubreddits(data.subreddits.slice(0, 10));
      setNotice("Site re-analyzed — review fields then save.");
      setTimeout(() => setNotice(null), 4000);
    },
  });

  useEffect(() => {
    if (!settings) return;
    setProjectName(settings.projectName);
    setSiteUrl(settings.siteUrl);
    setProductPrompt(settings.productPrompt || settings.description);
    setIndustry(settings.industry);
    setRedditProfileUrl(settings.redditProfileUrl);
    setKeywords(settings.keywords);
    setSubreddits(settings.subreddits);
    setDiscoveryMode(settings.discoveryMode);
    setPostsPerDay(settings.postsPerDay);
  }, [settings]);

  function showSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function saveBrand() {
    updateProject.mutate({
      name: projectName.trim() || "Mon projet",
      siteUrl: siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`,
      description: productPrompt,
      productPrompt,
      industry,
      keywords,
      redditProfileUrl: redditProfileUrl.trim(),
    });
  }

  function saveDiscovery() {
    updateDiscovery.mutate({ mode: discoveryMode, postsPerDay });
    updateFilters.mutate({ keywords, subreddits: subreddits.slice(0, 10) });
  }

  function addCompetitorUrl() {
    const url = competitorUrl.trim();
    if (!url) return;
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    addCompetitor.mutate({ url: normalized });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Brand, discovery et concurrents." />

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

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex shrink-0 gap-1 lg:w-44 lg:flex-col">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-left text-[13px] transition-colors",
                section === s.id
                  ? "bg-white/[0.08] font-medium text-white"
                  : "text-white/40 hover:text-white/70",
              )}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
          {section === "brand" && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-medium text-white">Brand</h2>
              <Field label="Nom du produit">
                <input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="URL du produit">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    className={cn(inputClass, "flex-1")}
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
                    Re-analyze
                  </button>
                </div>
              </Field>
              <Field label="Product prompt complet">
                <textarea
                  value={productPrompt}
                  onChange={(e) => setProductPrompt(e.target.value)}
                  rows={6}
                  className={cn(inputClass, "resize-none leading-relaxed")}
                />
              </Field>
              <Field label="URL de votre profil Reddit">
                <input
                  type="url"
                  value={redditProfileUrl}
                  onChange={(e) => setRedditProfileUrl(e.target.value)}
                  placeholder="https://www.reddit.com/user/moncompte"
                  className={inputClass}
                />
                <p className="mt-1.5 text-[11px] text-white/40">
                  RedPulse récupère vos stats publiques Reddit à la sauvegarde.
                </p>
              </Field>
              <SaveButton onClick={saveBrand} loading={updateProject.isLoading} />
            </div>
          )}

          {section === "discovery" && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-medium text-white">Discovery</h2>
              <Field label="Mode">
                <div className="grid gap-2 sm:grid-cols-3">
                  {DISCOVERY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setDiscoveryMode(mode.id)}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-colors",
                        discoveryMode === mode.id
                          ? "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
                          : "border-white/[0.06] bg-black/40 hover:border-white/10",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] font-medium text-white">
                          {mode.label}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            riskBadgeClass(mode.risk),
                          )}
                        >
                          {mode.risk}
                        </span>
                      </div>
                      <span className="mt-1 block text-[12px] text-white/40">
                        {mode.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={`Posts per sub · ${postsPerDay}`}>
                <input
                  type="range"
                  min={5}
                  max={50}
                  value={postsPerDay}
                  onChange={(e) => setPostsPerDay(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </Field>
              <Field label="Since">
                <input
                  type="date"
                  value={sinceDate}
                  onChange={(e) => setSinceDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Subreddits trackés">
                <textarea
                  value={subreddits.map((s) => `r/${s}`).join(", ")}
                  onChange={(e) => setSubreddits(parseList(e.target.value))}
                  rows={2}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
              <div>
                <p className="mb-2 text-[12px] text-white/50">
                  Subreddit Voice Analysis
                </p>
                <div className="space-y-3">
                  {subreddits.map((sub) => {
                    const voice = subredditVoices.find(
                      (v) => v.subreddit.toLowerCase() === sub.toLowerCase(),
                    );
                    const analyzed = voice?.analyzed ?? false;
                    return (
                      <div
                        key={sub}
                        className="rounded-xl border border-white/[0.06] bg-black/40 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[13px] font-medium text-primary">
                            r/{sub}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              analyzed
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-white/[0.06] text-white/50",
                            )}
                          >
                            {analyzed ? "Analysé ✓" : "En attente"}
                          </span>
                        </div>
                        {analyzed && voice?.profile ? (
                          <div className="mt-2 space-y-1 text-[11px] text-white/40">
                            <p>Ton : {voice.profile.tone ?? "—"}</p>
                            <p>Longueur : {voice.profile.avg_length ?? "—"}</p>
                            <p>
                              Emojis :{" "}
                              {(voice.profile.typical_emojis ?? []).join(" ") || "—"}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {!subreddits.length && (
                    <p className="text-[12px] text-white/40">
                      Ajoutez des subreddits — l&apos;analyse démarre au premier scraping.
                    </p>
                  )}
                </div>
              </div>
              <Field label="Mots-clés">
                <textarea
                  value={keywords.join(", ")}
                  onChange={(e) => setKeywords(parseList(e.target.value))}
                  rows={2}
                  className={cn(inputClass, "resize-none")}
                />
              </Field>
              {subredditScores.length > 0 && (
                <div>
                  <p className="mb-2 text-[12px] text-white/50">
                    Tracked subreddits · match score
                  </p>
                  <div className="space-y-2">
                    {subredditScores.map((s) => (
                      <div
                        key={s.subreddit}
                        className="flex items-center justify-between rounded-lg border border-white/[0.06] px-4 py-2.5"
                      >
                        <span className="text-[13px] text-primary">r/{s.subreddit}</span>
                        <span className="text-[12px] text-white/50">
                          {s.matchScore}/100 · {s.postCount} posts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <SaveButton
                onClick={saveDiscovery}
                loading={updateDiscovery.isLoading || updateFilters.isLoading}
              />
            </div>
          )}

          {section === "competitors" && (
            <div className="space-y-5">
              <h2 className="text-[14px] font-medium text-white">Competitors</h2>
              <p className="text-[12px] text-white/40">
                Reddit tracking coming soon — URLs stockées en base.
              </p>
              <div className="flex gap-2">
                <input
                  value={competitorUrl}
                  onChange={(e) => setCompetitorUrl(e.target.value)}
                  placeholder="https://competitor.com"
                  className={cn(inputClass, "flex-1")}
                />
                <button
                  type="button"
                  onClick={addCompetitorUrl}
                  disabled={!competitorUrl.trim() || addCompetitor.isLoading}
                  className="shrink-0 rounded-full bg-white px-4 py-2.5 text-[12px] font-semibold text-black hover:bg-white/90 disabled:opacity-50"
                >
                  Add competitor
                </button>
              </div>
              <div className="space-y-2">
                {competitors.length ? (
                  competitors.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] px-4 py-3"
                    >
                      <span className="truncate text-[13px] text-white/70">
                        {c.url}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCompetitor.mutate({ id: c.id })}
                        className="text-[11px] text-red-400 transition-opacity hover:opacity-90"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-white/40">No competitors tracked yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[12px] text-white/50">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-black hover:bg-white/90 disabled:opacity-50"
    >
      Save
    </button>
  );
}
