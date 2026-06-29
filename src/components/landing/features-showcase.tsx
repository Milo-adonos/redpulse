"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Flame, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "reply" | "warmup" | "influence" | "analytics";

const TABS: {
  id: TabId;
  label: string;
  windowTitle: string;
  screenshot: string;
  icon: typeof MessageSquare;
}[] = [
  {
    id: "reply",
    label: "AI Reply Engine",
    windowTitle: "Reply",
    screenshot: "/screenshots/screenshot-reply.png",
    icon: MessageSquare,
  },
  {
    id: "warmup",
    label: "Warmup",
    windowTitle: "Warmup",
    screenshot: "/screenshots/screenshot-warmup.png",
    icon: Flame,
  },
  {
    id: "influence",
    label: "Influence",
    windowTitle: "Influence",
    screenshot: "/screenshots/screenshot-influence.png",
    icon: Sparkles,
  },
  {
    id: "analytics",
    label: "Analytics",
    windowTitle: "Analytics",
    screenshot: "/screenshots/screenshot-analytics.png",
    icon: BarChart3,
  },
];

function MacWindowBar({ title }: { title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[#1a1a1a] bg-[#0d0d0d] px-4">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <p className="flex-1 text-center text-[11px] text-[#666666]">
        redpulse.app · {title}
      </p>
      <div className="w-[52px]" />
    </div>
  );
}

export function FeaturesShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("reply");
  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <section className="relative w-full bg-[#0a0a0a] pb-16 pt-20 sm:pb-20">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(249, 115, 22, 0.03), transparent)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] transition-all duration-150 ease-in-out",
                  isActive
                    ? "bg-[#f97316] text-white"
                    : "border border-[#222222] bg-transparent text-[#666666] hover:text-white/80",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mx-auto mt-5 max-w-[900px] overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#111111]">
          <MacWindowBar title={activeMeta.windowTitle} />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15, ease: "easeInOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeInOut" } }}
              className="relative max-h-[500px] overflow-hidden"
            >
              <Image
                src={activeMeta.screenshot}
                alt={`RedPulse ${activeMeta.windowTitle} interface`}
                width={1800}
                height={1200}
                className="block h-auto max-h-[500px] w-full object-cover object-top"
                priority={activeTab === "reply"}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-[14px] leading-relaxed text-[#666666]">
          Toutes les réponses sont générées dans le style exact de chaque subreddit.
          Indétectable. Approuvé en un clic.
        </p>
      </div>
    </section>
  );
}
