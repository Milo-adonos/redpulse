"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: ctx } = api.team.getContext.useQuery();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initial = ctx?.project?.name?.[0]?.toUpperCase() ?? "R";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl border border-white/[0.06] px-2 py-1.5 transition-colors hover:border-white/10"
      >
        <span className="hidden text-[13px] text-white/35 sm:inline">
          {ctx?.project?.name ?? ctx?.teamName ?? "RedPulse"}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[12px] font-semibold text-primary">
          {initial}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-white/[0.08] bg-[hsl(var(--surface-elevated))] py-1 shadow-glass">
          <div className="border-b border-white/[0.06] px-4 py-3">
            <p className="text-[13px] font-medium text-white">
              {ctx?.project?.name ?? ctx?.teamName}
            </p>
            <p className="text-[11px] text-white/35 capitalize">{ctx?.role}</p>
          </div>
          {[
            { href: "/dashboard/settings", label: "Paramètres" },
            { href: "/dashboard/team", label: "Équipe" },
            { href: "/dashboard/settings", label: "Apparence" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13px] text-white/55 hover:bg-white/[0.04] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-white/[0.06] px-4 py-2">
            <Link
              href="/api/auth/signout"
              className={cn("text-[12px] text-white/35 hover:text-white/60")}
            >
              Déconnexion
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
