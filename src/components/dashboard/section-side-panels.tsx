"use client";

import { api } from "@/trpc/react";

function banRiskColor(risk: number): string {
  if (risk < 0.1) return "#22c55e";
  if (risk <= 0.3) return "#f97316";
  return "#ef4444";
}

function formatKarma(value: number, hasProfile: boolean): string {
  if (!hasProfile) return "+0";
  return value >= 0 ? `+${value}` : String(value);
}

export function WarmupSidePanel() {
  const { data: stats, isLoading } = api.warmup.getStats.useQuery(undefined, {
    staleTime: 15_000,
  });

  const rows = [
    {
      label: "Comments today",
      value: String(stats?.commentsToday ?? 0),
      color: "#ffffff",
    },
    {
      label: "Karma gained",
      value: formatKarma(stats?.karmaGained ?? 0, stats?.hasRedditProfile ?? false),
      color: "#ffffff",
    },
    {
      label: "Ban risk",
      value: (stats?.banRisk ?? 0).toFixed(2),
      color: banRiskColor(stats?.banRisk ?? 0),
    },
  ];

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[13px] font-semibold text-[#f97316]">Karma builder</h2>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#888888]">
        Comments 100% niche-native. No product mention. Builds trust before any
        promotion.
      </p>
      {isLoading ? (
        <p className="mt-6 text-[13px] text-[#888888]">Chargement…</p>
      ) : (
        <div className="mt-6 space-y-0">
          {rows.map((row, index) => (
            <div key={row.label}>
              {index > 0 && <div className="my-4 border-t border-[#1a1a1a]" />}
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#888888]">{row.label}</span>
                <span className="font-semibold" style={{ color: row.color }}>
                  {row.value}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function InfluenceSidePanel() {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[16px] font-semibold text-[#f97316]">Strategy</h2>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#888888]">
        Vague enough to spark DMs. Never names the product — they ask for the link
        themselves.
      </p>
      <div className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
        <p className="text-[12px] text-[#666666]">Expected outcome</p>
        <p className="mt-2 text-[16px] font-semibold text-white">
          3-5 DMs asking for link / week
        </p>
      </div>
    </div>
  );
}
