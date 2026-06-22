"use client";

import { api } from "@/trpc/react";

function formatLastSync(date: Date | string | null | undefined) {
  if (!date) return "première sync…";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `il y a ${hours} h`;
}

export function ScraperStatus() {
  const { data: context } = api.team.getContext.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  return (
    <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-300/90 sm:flex">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      Listen actif · {formatLastSync(context?.lastSyncedAt)}
    </div>
  );
}
