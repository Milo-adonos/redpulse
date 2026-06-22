"use client";

import { cn } from "@/lib/utils";

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("h-10 w-full", className)}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="text-primary/70"
      />
    </svg>
  );
}

export function StatWidget({
  label,
  value,
  delta,
  trend,
  data,
}: {
  label: string;
  value: string;
  delta: string;
  trend: "up" | "down" | "neutral";
  data: number[];
}) {
  return (
    <div className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/10 hover:bg-white/[0.04]">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
          <p
            className={cn(
              "mt-1 text-[12px]",
              trend === "up" && "text-emerald-400/90",
              trend === "down" && "text-red-400/80",
              trend === "neutral" && "text-white/40",
            )}
          >
            {delta}
          </p>
        </div>
        <div className="w-24 opacity-60 transition-opacity group-hover:opacity-100">
          <Sparkline data={data} />
        </div>
      </div>
    </div>
  );
}

export function MiniBarChart({
  data,
  labels,
}: {
  data: number[];
  labels: string[];
}) {
  const max = Math.max(...data);
  return (
    <div className="flex h-32 items-end justify-between gap-2">
      {data.map((v, i) => (
        <div key={labels[i]} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-primary/80 to-primary/30 transition-all hover:from-primary hover:to-primary/50"
            style={{ height: `${(v / max) * 100}%`, minHeight: 4 }}
          />
          <span className="text-[9px] text-white/30">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
