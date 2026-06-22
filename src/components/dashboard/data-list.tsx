"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export type ListItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  badge?: string;
  preview?: string;
};

export function DataList({
  items,
  onSelect,
  actions,
}: {
  items: ListItem[];
  onSelect?: (id: string) => void;
  actions?: (id: string) => React.ReactNode;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="divide-y divide-white/[0.04] rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.03]"
          onMouseEnter={() => setHovered(item.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onSelect?.(item.id)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-primary">{item.subtitle}</span>
              {item.badge && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="mt-1 truncate text-sm font-medium text-white/90">{item.title}</p>
            <p className="mt-0.5 text-[11px] text-white/30">{item.meta}</p>
          </div>
          {actions?.(item.id)}
          {item.preview && hovered === item.id && (
            <div className="absolute left-full top-0 z-20 ml-2 hidden w-72 rounded-xl border border-white/10 bg-[#111113] p-4 shadow-glass lg:block">
              <p className="text-[11px] uppercase tracking-wider text-white/35">Aperçu</p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{item.preview}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FilterBar({
  tabs,
  active,
  onChange,
  search,
  onSearch,
  searchPlaceholder = "Filtrer…",
}: {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder?: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              "rounded-lg px-4 py-2 text-[13px] transition-all",
              active === tab
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/70",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={searchPlaceholder}
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-white/40">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
