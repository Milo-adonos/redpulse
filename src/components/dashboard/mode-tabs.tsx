"use client";

import { cn } from "@/lib/utils";
import { ux } from "@/lib/ux-copy";

export type AppMode = "listen" | "publish" | "analyze";

const MODES: { id: AppMode; label: string }[] = [
  { id: "listen", label: ux.modes.listen.label },
  { id: "publish", label: ux.modes.publish.label },
  { id: "analyze", label: ux.modes.analyze.label },
];

export function ModeTabs({
  active,
  onChange,
  className,
}: {
  active: AppMode;
  onChange: (mode: AppMode) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1",
        className,
      )}
      role="tablist"
      aria-label="Modes RedPulse"
    >
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="tab"
          aria-selected={active === mode.id}
          onClick={() => onChange(mode.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-[13px] font-medium transition-all duration-200",
            active === mode.id
              ? "bg-primary text-white shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]"
              : "text-white/40 hover:text-white/70",
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}

export function modeDescription(mode: AppMode) {
  return ux.modes[mode].description;
}
