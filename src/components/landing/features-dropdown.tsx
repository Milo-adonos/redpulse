"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { BarChart3, Flame, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    href: "/features#reply",
    icon: MessageSquare,
    title: "Reply",
    description:
      "AI replies that pass for real Redditors. Approve in one click.",
  },
  {
    href: "/features#warmup",
    icon: Flame,
    title: "Warmup",
    description:
      "Build karma naturally in your niche. Zero promotion, 100% authentic.",
  },
  {
    href: "/features#influence",
    icon: Sparkles,
    title: "Influence",
    description:
      "Create curiosity without mentioning your product. Let them ask for the link.",
  },
  {
    href: "/features#analytics",
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track every message sent, karma earned, and subreddit performance.",
  },
];

function FeatureIcon({ icon: Icon }: { icon: typeof MessageSquare }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff7ed]">
      <Icon className="h-5 w-5 text-[#f97316]" strokeWidth={2} />
    </div>
  );
}

export function FeaturesDropdown() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <Link
        href="/features"
        className="text-[13px] text-white/50 transition-colors hover:text-white"
      >
        Features
      </Link>

      <div
        className={cn(
          "absolute left-1/2 top-full z-50 mt-3 w-[380px] -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#111113]/95 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-150 ease-out",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0",
        )}
      >
        {FEATURES.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-white/[0.06]"
          >
            <FeatureIcon icon={item.icon} />
            <div>
              <p className="text-[14px] font-semibold text-white">{item.title}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/45">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
