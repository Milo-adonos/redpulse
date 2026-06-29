"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Copy,
  Flame,
  MessageSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabId = "reply" | "warmup" | "influence" | "analytics";

const TABS: {
  id: TabId;
  label: string;
  windowTitle: string;
  icon: typeof MessageSquare;
}[] = [
  {
    id: "reply",
    label: "AI Reply Engine",
    windowTitle: "AI Reply Engine",
    icon: MessageSquare,
  },
  { id: "warmup", label: "Warmup", windowTitle: "Warmup", icon: Flame },
  {
    id: "influence",
    label: "Influence",
    windowTitle: "Influence",
    icon: Sparkles,
  },
  {
    id: "analytics",
    label: "Analytics",
    windowTitle: "Analytics",
    icon: BarChart3,
  },
];

function MacWindowBar({ title }: { title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[#1a1a1a] bg-[#111111] px-4">
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

function ProgressBar({ value, color = "#f97316" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#1a1a1a]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ReplyWorkspace() {
  const posts = [
    {
      active: true,
      sub: "Nails",
      user: "nailartlover",
      time: "3m",
      title: "Best nail visualization app for home use?",
      tags: "nail design · visualization",
      score: 92,
    },
    {
      active: false,
      sub: "BeautyTech",
      user: "beautyfoundr",
      time: "15m",
      title: "Anyone tried AI nail try-on tools?",
      tags: null,
      score: 78,
    },
    {
      active: false,
      sub: "MakeupAddiction",
      user: "glossy_life",
      time: "1h",
      title: "How do you choose nail colors without trying?",
      tags: null,
      score: 71,
    },
  ];

  return (
    <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[35%_40%_25%]">
      {/* Left column */}
      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-white">Reply & DM</h3>
          <span className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#666666]">
            24 in queue
          </span>
        </div>
        <div className="mt-3 flex gap-1 text-[10px] text-[#666666]">
          {["All", "Mentions", "Keywords", "Inbox"].map((tab, i) => (
            <span
              key={tab}
              className={cn(
                "rounded px-2 py-1",
                i === 0 ? "bg-[#1a1a1a] text-white" : "",
              )}
            >
              {tab}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {posts.map((post) => (
            <div
              key={post.title}
              className={cn(
                "rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3",
                post.active && "border-l-2 border-l-[#f97316]",
              )}
            >
              <p className="text-[10px] text-[#666666]">
                r/{post.sub} · u/{post.user} · {post.time}
              </p>
              <p className="mt-1 text-[12px] leading-snug text-white">{post.title}</p>
              {post.tags && (
                <span className="mt-2 inline-block rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[9px] text-[#666666]">
                  {post.tags}
                </span>
              )}
              <p className="mt-2 text-[10px] text-[#666666]">
                Score : {post.score} · <span className="text-[#f97316]">new</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Center column */}
      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
          <p className="text-[10px] text-[#666666]">r/Nails · u/nailartlover</p>
          <p className="mt-2 text-[13px] font-medium text-white">
            Best nail visualization app for home use?
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#666666]">
            i want something that shows designs on my actual hand from a photo, not just
            generic swatches. any recs?
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
              <span className="text-[12px] text-[#666666]">AI suggested reply</span>
            </div>
            <button type="button" className="text-[11px] text-[#666666]">
              Try another
            </button>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white">
            omg i had the exact same issue picking colors ngl 😭 i stumbled on makemynails
            a few weeks ago and it literally shows the design on your actual hand from a
            photo?? changed everything for me fr
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Natural", "Casual", "Subtle"].map((tone, i) => (
              <span
                key={tone}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px]",
                  i === 0
                    ? "bg-[#f97316]/15 text-[#f97316]"
                    : "border border-[#222222] text-[#666666]",
                )}
              >
                {tone}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[#666666]">
            Posting as u/nailuser · 127 karma
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#222222] px-3 py-2 text-[11px] text-[#666666]"
            >
              Skip
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-[#f97316] px-3 py-2 text-[11px] font-medium text-white"
            >
              <Copy className="h-3 w-3" />
              Copy & send
            </button>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="p-4">
        <h3 className="text-[12px] font-semibold text-[#f97316]">Profile Information</h3>

        <p className="mt-4 text-[10px] uppercase tracking-wider text-[#666666]">Author</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] text-[#f97316]">
            n
          </div>
          <div>
            <p className="text-[12px] text-white">u/nailartlover</p>
            <p className="text-[10px] text-[#666666]">0 followers</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
          {[
            ["Karma", "847"],
            ["Account", "2y"],
            ["Posts", "34"],
            ["Comments", "892"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md bg-[#0c0c0c] p-2">
              <p className="text-[#666666]">{k}</p>
              <p className="mt-0.5 font-medium text-white">{v}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] uppercase tracking-wider text-[#666666]">Subreddit</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f97316]/20 text-[10px] text-[#f97316]">
            N
          </div>
          <div>
            <p className="text-[12px] text-white">r/Nails</p>
            <p className="text-[10px] text-[#666666]">4.1M members · since 18y</p>
          </div>
        </div>
        <p className="mt-1 text-[10px] text-[#666666]">Posts/day : 82</p>

        <p className="mt-4 text-[10px] uppercase tracking-wider text-[#666666]">
          Opportunity score
        </p>
        <p className="mt-1 text-[28px] font-bold text-white">
          89<span className="text-[14px] font-normal text-[#666666]">/100</span>
        </p>
        <div className="mt-3 space-y-2">
          {[
            ["Relevance", 94],
            ["Volume", 82],
            ["Niche fit", 91],
            ["Competition", 38],
          ].map(([label, val]) => (
            <div key={String(label)}>
              <div className="mb-1 flex justify-between text-[10px]">
                <span className="text-[#666666]">{label}</span>
                <span className="text-white">{val}</span>
              </div>
              <ProgressBar value={Number(val)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarmupWorkspace() {
  return (
    <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[35%_40%_25%]">
      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-white">Warmup queue</h3>
          <span className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[10px] text-[#666666]">
            12 today
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { sub: "NailArt", user: "glitter_queen", title: "obsessed with this chrome set 💅", score: 88 },
            { sub: "Nails", user: "polish_addict", title: "first time doing french tips at home", score: 76 },
            { sub: "RedditLaqueristas", user: "gel_guru", title: "what base coat do you swear by?", score: 72 },
          ].map((post, i) => (
            <div
              key={post.title}
              className={cn(
                "rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3",
                i === 0 && "border-l-2 border-l-[#f97316]",
              )}
            >
              <p className="text-[10px] text-[#666666]">
                r/{post.sub} · u/{post.user}
              </p>
              <p className="mt-1 text-[12px] text-white">{post.title}</p>
              <p className="mt-2 text-[10px] text-[#666666]">Fit : {post.score}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
          <p className="text-[10px] text-[#666666]">r/NailArt · u/glitter_queen</p>
          <p className="mt-2 text-[13px] font-medium text-white">
            obsessed with this chrome set 💅
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
          <div className="flex items-center gap-2">
            <Flame className="h-3.5 w-3.5 text-[#f97316]" />
            <span className="text-[12px] text-[#666666]">Warmup comment · zero promo</span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white">
            wait this is literally perfect?? the chrome reflection is insane 😭 what
            products did you use for the base??
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#28c840]/10 px-3 py-1">
            <span className="text-[11px] font-medium text-[#28c840]">Anti-ban 10/10</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#222222] px-3 py-2 text-[11px] text-[#666666]"
            >
              Skip
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#f97316] px-3 py-2 text-[11px] font-medium text-white"
            >
              Copy & send
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[12px] font-semibold text-[#f97316]">Karma builder</h3>
        <p className="mt-3 text-[11px] leading-relaxed text-[#666666]">
          Comments 100% niche-native. No product mention. Builds trust before any
          promotion.
        </p>
        <div className="mt-4 space-y-2">
          {[
            ["Comments today", "4"],
            ["Karma gained", "+23"],
            ["Ban risk", "0.02"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-md bg-[#0c0c0c] p-2 text-[11px]">
              <span className="text-[#666666]">{k}</span>
              <span className="text-white">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfluenceWorkspace() {
  return (
    <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[35%_40%_25%]">
      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-white">Influence queue</h3>
          <span className="rounded-full bg-[#f97316]/15 px-2 py-0.5 text-[10px] text-[#f97316]">
            Curiosity mode
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { sub: "Nails", title: "how do you preview designs before booking?", score: 85 },
            { sub: "BeautyTech", title: "AR try-on apps worth it?", score: 79 },
          ].map((post, i) => (
            <div
              key={post.title}
              className={cn(
                "rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3",
                i === 0 && "border-l-2 border-l-[#f97316]",
              )}
            >
              <p className="text-[10px] text-[#666666]">r/{post.sub}</p>
              <p className="mt-1 text-[12px] text-white">{post.title}</p>
              <p className="mt-2 text-[10px] text-[#666666]">Curiosity : {post.score}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-[#1a1a1a] p-4 lg:border-b-0 lg:border-r">
        <div className="rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] p-3">
          <p className="text-[10px] text-[#666666]">r/Nails</p>
          <p className="mt-2 text-[13px] font-medium text-white">
            how do you preview designs before booking?
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
            <span className="text-[12px] text-[#666666]">Influence reply · no link</span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white">
            been using something for this for a few weeks and it genuinely changed things
            ngl… still lowkey obsessed but idk if it works for everyone
          </p>
          <span className="mt-3 inline-block rounded-full bg-[#f97316]/15 px-2.5 py-1 text-[10px] text-[#f97316]">
            Curiosity mode
          </span>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-[#222222] px-3 py-2 text-[11px] text-[#666666]"
            >
              Skip
            </button>
            <button
              type="button"
              className="rounded-lg bg-[#f97316] px-3 py-2 text-[11px] font-medium text-white"
            >
              Copy & send
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-[12px] font-semibold text-[#f97316]">Strategy</h3>
        <p className="mt-3 text-[11px] leading-relaxed text-[#666666]">
          Vague enough to spark DMs. Never names the product — they ask for the link
          themselves.
        </p>
        <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3">
          <p className="text-[10px] text-[#666666]">Expected outcome</p>
          <p className="mt-1 text-[12px] text-white">3–5 DMs asking for link / week</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsWorkspace() {
  const kpis = [
    { label: "Messages envoyés", value: "847", delta: "+12%" },
    { label: "Karma gagné", value: "+1,240", delta: "+8%" },
    { label: "Subreddits actifs", value: "6", delta: "stable" },
    { label: "Score anti-ban moy.", value: "9.4", delta: "+0.2" },
  ];

  const rows = [
    { sub: "r/Nails", sent: 312, karma: 420, score: 9.6 },
    { sub: "r/NailArt", sent: 198, karma: 310, score: 9.4 },
    { sub: "r/BeautyTech", sent: 156, karma: 280, score: 9.1 },
    { sub: "r/MakeupAddiction", sent: 181, karma: 230, score: 9.3 },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-3"
          >
            <p className="text-[10px] text-[#666666]">{kpi.label}</p>
            <p className="mt-1 text-[20px] font-bold text-white">{kpi.value}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-[#f97316]">
              <TrendingUp className="h-3 w-3" />
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
        <p className="text-[11px] text-[#666666]">Messages · 30 derniers jours</p>
        <svg viewBox="0 0 280 64" className="mt-3 h-16 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,48 L20,42 L40,38 L60,44 L80,30 L100,28 L120,22 L140,26 L160,18 L180,20 L200,12 L220,16 L240,8 L260,10 L280,6 L280,64 L0,64 Z"
            fill="url(#sparkGrad)"
          />
          <path
            d="M0,48 L20,42 L40,38 L60,44 L80,30 L100,28 L120,22 L140,26 L160,18 L180,20 L200,12 L220,16 L240,8 L260,10 L280,6"
            fill="none"
            stroke="#f97316"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-[#1a1a1a]">
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#111111] text-[#666666]">
              <th className="px-3 py-2 font-medium">Subreddit</th>
              <th className="px-3 py-2 font-medium">Envoyés</th>
              <th className="px-3 py-2 font-medium">Karma</th>
              <th className="px-3 py-2 font-medium">Anti-ban</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sub} className="border-b border-[#1a1a1a] bg-[#0c0c0c] last:border-0">
                <td className="px-3 py-2.5 text-white">{row.sub}</td>
                <td className="px-3 py-2.5 text-[#666666]">{row.sent}</td>
                <td className="px-3 py-2.5 text-[#666666]">+{row.karma}</td>
                <td className="px-3 py-2.5 text-[#f97316]">{row.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "reply":
      return <ReplyWorkspace />;
    case "warmup":
      return <WarmupWorkspace />;
    case "influence":
      return <InfluenceWorkspace />;
    case "analytics":
      return <AnalyticsWorkspace />;
  }
}

export function FeaturesShowcase() {
  const [activeTab, setActiveTab] = useState<TabId>("reply");
  const activeMeta = TABS.find((t) => t.id === activeTab)!;

  return (
    <section className="bg-[#080808] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
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
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] transition-all duration-150 ease-out",
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

        <div className="mx-auto mt-8 max-w-[900px] overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0d0d0d]">
          <MacWindowBar title={activeMeta.windowTitle} />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15, ease: "easeOut" } }}
              exit={{ opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }}
            >
              <TabContent tab={activeTab} />
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
