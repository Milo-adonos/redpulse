"use client";

import { useState } from "react";
import { MiniBarChart, StatWidget } from "@/components/dashboard/stat-widget";
import { PageHeader } from "@/components/dashboard/data-list";
import { ModeTabs, modeDescription, type AppMode } from "@/components/dashboard/mode-tabs";
import { NeuSurface } from "@/components/ui/neu-surface";
import { api } from "@/trpc/react";

export default function AnalyticsPage() {
  const [mode, setMode] = useState<AppMode>("analyze");
  const { data, isLoading } = api.analytics.summary.useQuery();

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/40">
        Chargement des analytics…
      </div>
    );
  }

  const { kpis, subredditEngagement, weeklySent, actionSplit } = data;
  const totalActions =
    actionSplit.sent + actionSplit.pending + actionSplit.drafts || 1;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analyze"
        description={modeDescription(mode)}
        action={<ModeTabs active={mode} onChange={setMode} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatWidget
          label="Vues estimées"
          value={kpis.views >= 1000 ? `${(kpis.views / 1000).toFixed(1)}K` : String(kpis.views)}
          delta="30 derniers jours"
          trend="up"
          data={[40, 50, 55, 60, 70, 80, kpis.views / 100]}
        />
        <StatWidget
          label="Taux conversion"
          value={`${kpis.conversion}%`}
          delta="replies / conversations"
          trend="up"
          data={[1, 1.5, 2, 2.5, 3, kpis.conversion, kpis.conversion]}
        />
        <StatWidget
          label="Upvotes moyens"
          value={String(kpis.avgUpvotes)}
          delta="par reply envoyée"
          trend="neutral"
          data={[12, 14, 16, 18, 20, kpis.avgUpvotes, kpis.avgUpvotes]}
        />
        <StatWidget
          label="Conversations"
          value={String(kpis.conversations)}
          delta="Listen · 30j"
          trend="up"
          data={[100, 120, 140, 160, 180, 200, kpis.conversations]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <NeuSurface className="p-6">
          <h2 className="text-sm font-medium text-white/80">Engagement par subreddit</h2>
          <div className="mt-6">
            {subredditEngagement.length ? (
              <MiniBarChart
                data={subredditEngagement.map((s) => s.value)}
                labels={subredditEngagement.map((s) => s.label.slice(0, 8))}
              />
            ) : (
              <p className="text-[12px] text-white/35">Pas encore de données.</p>
            )}
          </div>
        </NeuSurface>
        <NeuSurface className="p-6">
          <h2 className="text-sm font-medium text-white/80">Répartition Publish</h2>
          <div className="mt-6 space-y-4">
            {[
              { label: "Envoyées", pct: Math.round((actionSplit.sent / totalActions) * 100), color: "bg-primary" },
              { label: "En attente", pct: Math.round((actionSplit.pending / totalActions) * 100), color: "bg-amber-500/70" },
              { label: "Brouillons", pct: Math.round((actionSplit.drafts / totalActions) * 100), color: "bg-white/20" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-[12px]">
                  <span className="text-white/50">{row.label}</span>
                  <span className="text-white/70">{row.pct}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </NeuSurface>
      </div>
    </div>
  );
}
