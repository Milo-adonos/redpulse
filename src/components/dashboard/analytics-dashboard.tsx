"use client";

import Link from "next/link";
import type { inferRouterOutputs } from "@trpc/server";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppRouter } from "@/server/api/root";

type DashboardData = inferRouterOutputs<AppRouter>["team"]["getDashboard"];

const SECTION_LABELS: Record<string, string> = {
  reply: "Reply",
  warmup: "Warmup",
  influence: "Influence",
};

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

function formatTrend(
  value: number | null | "stable" | undefined,
): { text: string; show: boolean } {
  if (value === "stable") return { text: "stable", show: true };
  if (value == null) return { text: "—", show: false };
  if (value === 0) return { text: "—", show: false };
  return { text: value > 0 ? `+${value}%` : `${value}%`, show: true };
}

function banScoreColor(score: number): string {
  if (score > 8) return "#22c55e";
  if (score >= 6) return "#f97316";
  return "#ef4444";
}

function KpiCard({
  label,
  value,
  valueColor = "#ffffff",
  trend,
}: {
  label: string;
  value: string;
  valueColor?: string;
  trend: { text: string; show: boolean };
}) {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <p className="text-[13px] text-[#888888]">{label}</p>
      <p
        className="mt-2 text-[36px] font-bold leading-none"
        style={{ color: valueColor }}
      >
        {value}
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-[13px] text-[#f97316]">
        {trend.show && <TrendingUp className="h-3.5 w-3.5" />}
        <span>{trend.text}</span>
      </div>
    </div>
  );
}

function SectionBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-white">{label}</span>
        <span className="text-[#888888]">{count}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-sm bg-[#1a1a1a]">
        <div
          className="h-full rounded-sm bg-[#f97316] transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AnalyticsDashboard({
  data,
  title = "Dashboard",
  onRefresh,
  isRefreshing,
}: {
  data: DashboardData;
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const { metrics, reddit, impact, recentSent, dailySentLast30Days, subredditTable, bestSubreddit } =
    data;

  const sentTrend = formatTrend(metrics.sent.trendPct);
  const karmaTrend = formatTrend(
    data.hasRedditProfile ? metrics.karmaTrendPct : null,
  );
  const subTrend = formatTrend(metrics.activeSubreddits.trend);
  const banTrend = formatTrend(metrics.avgBanTrendPct);

  const karmaDisplay =
    data.hasRedditProfile && metrics.karmaGainSinceStart !== 0
      ? metrics.karmaGainSinceStart > 0
        ? `+${metrics.karmaGainSinceStart.toLocaleString("fr-FR")}`
        : String(metrics.karmaGainSinceStart)
      : data.hasRedditProfile
        ? "+0"
        : "+0";

  const sectionTotal =
    impact.sentBySection.reply +
    impact.sentBySection.warmup +
    impact.sentBySection.influence;

  const radialData = [{ name: "rate", value: metrics.sent.rate, fill: "#f97316" }];

  return (
    <div className="space-y-6 bg-[#080808] pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-white">{title}</h1>
          <p className="mt-1 text-[13px] text-[#888888]">
            Données réelles depuis votre activité RedPulse
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-[#222222] px-4 py-2 text-[13px] text-[#888888] transition-all duration-150 ease-out hover:text-white disabled:opacity-50"
          >
            {isRefreshing ? "Actualisation…" : "Actualiser"}
          </button>
        )}
      </div>

      {/* Row 1 — KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Messages envoyés"
          value={String(metrics.sent.total)}
          trend={sentTrend}
        />
        <KpiCard
          label="Karma gagné"
          value={karmaDisplay}
          trend={karmaTrend}
        />
        <KpiCard
          label="Subreddits actifs"
          value={String(metrics.activeSubreddits.count)}
          trend={subTrend}
        />
        <KpiCard
          label="Score anti-ban moy."
          value={metrics.avgBanScore > 0 ? metrics.avgBanScore.toFixed(1) : "0"}
          valueColor={banScoreColor(metrics.avgBanScore)}
          trend={banTrend}
        />
      </div>

      {/* Row 2 — Chart */}
      <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-6">
        <p className="text-[13px] text-[#888888]">Messages · 30 derniers jours</p>
        <div className="mt-4 h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailySentLast30Days} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1a1a1a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#444444", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#444444", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: 8,
                  color: "#ffffff",
                  fontSize: 13,
                }}
                labelStyle={{ color: "#888888" }}
                formatter={(value) => [value ?? 0, "Envoyés"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#f97316"
                strokeWidth={2}
                fill="url(#msgGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Subreddit table */}
      <div className="overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#111111]">
        <div className="grid grid-cols-4 border-b border-[#1a1a1a] bg-[#0d0d0d] px-5 py-3 text-[13px] text-[#666666]">
          <span>Subreddit</span>
          <span>Envoyés</span>
          <span>Karma</span>
          <span>Anti-ban</span>
        </div>
        {subredditTable.length === 0 ? (
          <p className="px-5 py-12 text-center text-[14px] text-[#888888]">
            Commencez à envoyer des messages pour voir vos stats par subreddit
          </p>
        ) : (
          subredditTable.map((row) => (
            <div
              key={row.subreddit}
              className="grid grid-cols-4 border-b border-[#141414] px-5 py-4 last:border-0"
            >
              <span className="text-[14px] text-white">r/{row.subreddit}</span>
              <span className="text-[14px] text-[#888888]">{row.sent}</span>
              <span className="text-[14px] text-[#888888]">
                {row.karma > 0 ? `+${row.karma}` : "+0"}
              </span>
              <span
                className="text-[14px] font-semibold"
                style={{ color: "#f97316" }}
              >
                {row.avgBanScore.toFixed(1)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Row 4 — 2 columns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
          <p className="text-[13px] text-[#888888]">Activité par section</p>
          <div className="mt-5 space-y-4">
            <SectionBar
              label="Reply"
              count={impact.sentBySection.reply}
              total={sectionTotal}
            />
            <SectionBar
              label="Warmup"
              count={impact.sentBySection.warmup}
              total={sectionTotal}
            />
            <SectionBar
              label="Influence"
              count={impact.sentBySection.influence}
              total={sectionTotal}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
          <p className="text-[13px] text-[#888888]">Derniers messages envoyés</p>
          <div className="mt-4">
            {recentSent.length === 0 ? (
              <p className="text-[14px] text-[#888888]">Aucun message envoyé</p>
            ) : (
              recentSent.map((msg, index) => (
                <div
                  key={msg.id}
                  className={cn(
                    "py-3",
                    index > 0 && "border-t border-[#141414]",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-[#f97316]">
                      {SECTION_LABELS[msg.section] ?? msg.section}
                    </span>
                    <span className="text-[12px] text-[#888888]">
                      r/{msg.subreddit}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[13px] text-[#888888]">
                    {msg.preview}
                  </p>
                  <p className="mt-1 text-[12px] text-[#555555]">
                    {formatRelativeTime(msg.date)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 5 — 3 columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
          <p className="text-[13px] text-[#888888]">Taux d&apos;envoi global</p>
          <p className="mt-3 text-[36px] font-bold text-white">
            {metrics.sent.rate}%
          </p>
          <p className="mt-1 text-[13px] text-[#888888]">
            {metrics.generated.total} générés · {metrics.sent.total} envoyés
          </p>
          <div className="mx-auto mt-4 h-[120px] w-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#1a1a1a" }}>
                  {radialData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </RadialBar>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
          <p className="text-[13px] text-[#888888]">Meilleur subreddit</p>
          {bestSubreddit ? (
            <>
              <p className="mt-3 text-[24px] font-bold text-white">
                r/{bestSubreddit.name}
              </p>
              <div className="mt-4 space-y-2 text-[14px]">
                <div className="flex justify-between">
                  <span className="text-[#888888]">Envoyés</span>
                  <span className="font-semibold text-white">{bestSubreddit.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Anti-ban moyen</span>
                  <span className="font-semibold text-[#f97316]">
                    {bestSubreddit.avgBanScore.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#888888]">Karma estimé</span>
                  <span className="font-semibold text-white">
                    {bestSubreddit.karma > 0
                      ? `+${bestSubreddit.karma}`
                      : "+0"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-6 text-[14px] text-[#888888]">—</p>
          )}
        </div>

        <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
          <p className="text-[13px] text-[#888888]">Votre compte Reddit</p>
          {!data.hasRedditProfile ? (
            <div className="mt-4">
              <p className="text-[14px] leading-relaxed text-[#888888]">
                Connectez votre profil Reddit dans Settings
              </p>
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-flex rounded-lg bg-[#f97316] px-4 py-2.5 text-[13px] font-medium text-white transition-all duration-150 hover:bg-[#ea6c0a]"
              >
                Configurer
              </Link>
            </div>
          ) : reddit ? (
            <div className="mt-4 space-y-2 text-[14px]">
              <p className="font-medium text-white">
                u/{data.redditUsername ?? "—"}
              </p>
              <p className="text-[#888888]">
                Karma total : {reddit.totalKarma.toLocaleString("fr-FR")}
              </p>
              <p className="text-[#888888]">
                Ancienneté : {reddit.accountAgeLabel}
              </p>
              {data.redditProfileUrl && (
                <a
                  href={data.redditProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block pt-2 text-[13px] text-[#f97316] hover:underline"
                >
                  Voir le profil →
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
