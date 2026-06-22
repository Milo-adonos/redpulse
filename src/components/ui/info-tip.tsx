"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InfoTip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label="Plus d'informations"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-white/10 text-[10px] text-white/35 transition-colors hover:border-primary/30 hover:text-primary"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[hsl(var(--surface-elevated))] px-3 py-2 text-[11px] leading-relaxed text-white/55 shadow-glass"
        >
          {text}
        </span>
      )}
    </span>
  );
}
