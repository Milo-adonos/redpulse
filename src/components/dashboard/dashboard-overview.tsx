"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import { cn } from "@/lib/utils";
import { MiniBarChart } from "@/components/dashboard/stat-widget";
import type { AppRouter } from "@/server/api/root";

type DashboardData = inferRouterOutputs<AppRouter>["team"]["getDashboard"];

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function banScoreColor(score: number): string {
  if (score > 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function banScoreBg(score: number): string {
  if (score > 8) return "bg-emerald-500/15 text-emerald-300";
  if (score >= 6) return "bg-amber-500/15 text-amber-300";
  return "bg-red-500/15 text-red-300";
}

const SECTION_LABELS: Record<string, string> = {
  reply: "Reply",
  warmup: "Warmup",
  influence: "Influence",
};

function MetricCard({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5",
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>
      {children}
    </div>
  );
}

function SectionBadge({ label, count }: { label: string; count: number }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/50">
      {label} {count}
    </span>
  );
}

function EmptyHint({ message }: { message: string }) {
  return <p className="mt-2 text-[12px] text-white/35">{message}</p>;
}

export function DashboardOverview({
  data,
  onRefresh,
  isRefreshing,
}: {
  data: DashboardData;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const { metrics, reddit, impact, recentSent, hasAnyData, hasRedditProfile, redditUsername } =
    data;
  const emptyMessage = "Commencez à utiliser RedPulse pour voir vos stats";

  const trendLabel =
    metrics.sent.trendPct == null
      ? "—"
      : metrics.sent.trendPct >= 0
        ? `+${metrics.sent.trendPct}% vs semaine dernière`
        : `${metrics.sent.trendPct}% vs semaine dernière`;

  const karmaGainWeek =
    impact.karmaGainThisWeek != null
      ? impact.karmaGainThisWeek >= 0
        ? `+${impact.karmaGainThisWeek}`
        : String(impact.karmaGainThisWeek)
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-[13px] text-white/40">
            Dernière mise à jour : {formatRelativeTime(data.lastUpdated)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="shrink-0 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
        >
          {isRefreshing ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      {!hasAnyData && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] text-white/50">
          {emptyMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Messages générés">
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.generated.total}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SectionBadge label="Reply" count={metrics.generated.reply} />
            <SectionBadge label="Warmup" count={metrics.generated.warmup} />
            <SectionBadge label="Influence" count={metrics.generated.influence} />
          </div>
          {metrics.generated.total === 0 && <EmptyHint message={emptyMessage} />}
        </MetricCard>

        <MetricCard label="Messages envoyés">
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.sent.total}
          </p>
          <p className="mt-1 text-[12px] text-white/45">
            Taux d&apos;envoi : {metrics.sent.rate}%
          </p>
          <p
            className={cn(
              "mt-1 text-[12px]",
              metrics.sent.trendPct == null
                ? "text-white/35"
                : metrics.sent.trendPct >= 0
                  ? "text-emerald-400/90"
                  : "text-red-400/80",
            )}
          >
            {metrics.sent.total === 0 ? emptyMessage : trendLabel}
          </p>
        </MetricCard>

        <MetricCard label="Subreddits actifs">
          <p className="mt-3 text-3xl font-semibold text-white">
            {metrics.activeSubreddits.count}
          </p>
          {metrics.activeSubreddits.topSubreddit ? (
            <p className="mt-1 text-[12px] text-white/45">
              Plus actif : r/{metrics.activeSubreddits.topSubreddit}
            </p>
          ) : (
            <EmptyHint message={emptyMessage} />
          )}
        </MetricCard>

        <MetricCard label="Score anti-ban moyen">
          <p
            className={cn(
              "mt-3 text-3xl font-semibold",
              metrics.avgBanScore > 0
                ? banScoreColor(metrics.avgBanScore)
                : "text-white",
            )}
          >
            {metrics.avgBanScore > 0 ? metrics.avgBanScore.toFixed(1) : "0"}
          </p>
          {metrics.avgBanScore > 0 ? (
            <p className="mt-1 text-[12px] text-white/45">
              {metrics.avgBanScore > 8
                ? "Excellent"
                : metrics.avgBanScore >= 6
                  ? "Correct"
                  : "À surveiller"}
            </p>
          ) : (
            <EmptyHint message={emptyMessage} />
          )}
        </MetricCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div>
            <h2 className="text-sm font-medium text-white/80">
              Votre compte Reddit
            </h2>
            {redditUsername ? (
              <p className="mt-0.5 text-[12px] text-white/35">
                Données publiques de u/{redditUsername}
              </p>
            ) : null}
          </div>

          {!hasRedditProfile ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <p className="text-[13px] text-white/70">
                Connectez votre profil Reddit dans Settings pour voir vos stats
                Reddit
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
              >
                Aller aux Settings →
              </Link>
            </div>
          ) : reddit ? (
            <>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                  Karma
                </p>
                <p className="mt-3 text-4xl font-semibold text-white">
                  {reddit.totalKarma.toLocaleString("fr-FR")}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-white/45">
                  <span>Post : {reddit.linkKarma.toLocaleString("fr-FR")}</span>
                  <span>
                    Commentaires : {reddit.commentKarma.toLocaleString("fr-FR")}
                  </span>
                </div>
                {reddit.karmaGainSinceStart != null && reddit.karmaGainSinceStart !== 0 ? (
                  <p className="mt-2 text-[12px] text-emerald-400/90">
                    {reddit.karmaGainSinceStart >= 0 ? "+" : ""}
                    {reddit.karmaGainSinceStart} depuis le début RedPulse
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                  Activité
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-2xl font-semibold text-white">
                      {reddit.commentCount}
                    </p>
                    <p className="text-[12px] text-white/45">Commentaires</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">
                      {reddit.postCount}
                    </p>
                    <p className="text-[12px] text-white/45">Posts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-white">
                      {reddit.accountAgeDays != null
                        ? `${reddit.accountAgeDays} j`
                        : "—"}
                    </p>
                    <p className="text-[12px] text-white/45">Ancienneté</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
                  Subreddits actifs
                </p>
                <div className="mt-4 space-y-2">
                  {reddit.activeSubreddits.length ? (
                    reddit.activeSubreddits.map((s) => (
                      <div
                        key={s.subreddit}
                        className="flex items-center justify-between text-[13px]"
                      >
                        <span className="text-white/70">r/{s.subreddit}</span>
                        <span className="text-white/40">
                          {s.contributions} contributions
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-white/35">Aucune activité détectée</p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-sm font-medium text-white/80">
            Corrélation RedPulse + Reddit
          </h2>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
              Impact RedPulse
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-[13px] text-white/70">
                Messages envoyés cette semaine :{" "}
                <span className="font-medium text-white">
                  {impact.sentThisWeek}
                </span>
              </p>
              {hasRedditProfile && karmaGainWeek != null ? (
                <>
                  <p className="text-[13px] text-white/70">
                    Gain de karma estimé :{" "}
                    <span className="font-medium text-emerald-400">
                      {karmaGainWeek}
                    </span>
                  </p>
                  <p className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[12px] text-white/60">
                    Tu as envoyé {impact.sentThisWeek} message
                    {impact.sentThisWeek !== 1 ? "s" : ""} via RedPulse, ton karma
                    a {impact.karmaGainThisWeek! >= 0 ? "augmenté de" : "varie de"}{" "}
                    {karmaGainWeek} cette semaine
                  </p>
                </>
              ) : (
                <EmptyHint
                  message={
                    hasRedditProfile
                      ? "Pas assez de données pour estimer le gain de karma"
                      : "Connectez Reddit pour voir l'impact karma"
                  }
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
              Meilleure performance
            </p>
            <div className="mt-3 space-y-3 text-[13px]">
              <div>
                <p className="text-white/45">Plus de messages RedPulse</p>
                <p className="text-white/80">
                  {impact.topSentSubreddit ? `r/${impact.topSentSubreddit}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-white/45">Karma le plus fort</p>
                <p className="text-white/80">
                  {impact.topKarmaSubreddit ? `r/${impact.topKarmaSubreddit}` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
              Activité par section
            </p>
            <p className="mt-1 text-[11px] text-white/30">Messages envoyés</p>
            <div className="mt-4">
              {impact.sentBySection.reply +
                impact.sentBySection.warmup +
                impact.sentBySection.influence >
              0 ? (
                <MiniBarChart
                  data={[
                    impact.sentBySection.reply,
                    impact.sentBySection.warmup,
                    impact.sentBySection.influence,
                  ]}
                  labels={["Reply", "Warmup", "Influence"]}
                />
              ) : (
                <EmptyHint message={emptyMessage} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-sm font-medium text-white/80">Activité récente</h2>
        <p className="mt-0.5 text-[12px] text-white/35">
          10 derniers messages envoyés
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35">
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Subreddit</th>
                <th className="pb-3 pr-4 font-medium">Section</th>
                <th className="pb-3 pr-4 font-medium">Aperçu</th>
                <th className="pb-3 font-medium">Ban score</th>
              </tr>
            </thead>
            <tbody>
              {recentSent.length ? (
                recentSent.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/[0.04] last:border-0"
                  >
                    <td className="py-3 pr-4 text-white/50">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 pr-4 text-white/70">
                      r/{row.subreddit}
                    </td>
                    <td className="py-3 pr-4 text-white/60">
                      {SECTION_LABELS[row.section] ?? row.section}
                    </td>
                    <td className="max-w-xs truncate py-3 pr-4 text-white/50">
                      {row.preview}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium",
                          banScoreBg(row.banScore),
                        )}
                      >
                        {row.banScore}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/35">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
