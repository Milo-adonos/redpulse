"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GlassPanel } from "./glass-panel";
import { StickyLabel } from "./scroll-chapter";

const streamItems = [
  {
    sub: "r/SaaS",
    user: "u/indie_founder",
    time: "12m",
    title: "Best tool to market on Reddit without getting banned?",
    score: 94,
    isNew: true,
    tags: ["reddit marketing", "growth"],
    delay: 0,
  },
  {
    sub: "r/entrepreneur",
    user: "u/bootstrapped_ceo",
    time: "34m",
    title: "Anyone found a way to get traction on Reddit that actually works?",
    score: 81,
    isNew: true,
    tags: [] as string[],
    delay: 0.15,
  },
  {
    sub: "r/startups",
    user: "u/growth_hacker22",
    time: "1h",
    title: "Reddit keeps banning my accounts when I try to promote anything",
    score: 73,
    isNew: false,
    tags: [] as string[],
    delay: 0.3,
  },
];

const GENERATED_REPLY =
  "honestly same, i spent like 3 weeks trying different things and nothing stuck ngl. stumbled on redpulse a while back and it genuinely changed how i approach reddit marketing... still lowkey obsessed with how natural the replies feel";

export function DiscoverDemo() {
  return (
    <GlassPanel className="overflow-hidden p-1">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <StickyLabel>Live stream · r/SaaS · r/entrepreneur · r/startups</StickyLabel>
      </div>
      <div className="space-y-2 p-4">
        {streamItems.map((item) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: item.delay, duration: 0.5 }}
            className="group rounded-xl border border-white/[0.05] bg-white/[0.02] p-4 transition-colors hover:border-primary/20 hover:bg-white/[0.04]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-white/40">
                  <span className="font-medium text-primary">{item.sub}</span>
                  {" · "}
                  {item.user}
                  {" · "}
                  {item.time}
                </p>
                <p className="mt-1.5 text-sm leading-snug text-white/80">
                  {item.title}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-medium text-[#f97316]">
                    Score : {item.score}
                  </span>
                  {item.isNew && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      new
                    </span>
                  )}
                </div>
                {item.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/45"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: item.delay + 0.2 }}
                className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-400/90"
              >
                match
              </motion.span>
            </div>
            <motion.div
              className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/5"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ delay: item.delay + 0.3, duration: 0.8 }}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-transparent"
                style={{ width: `${item.score}%` }}
              />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function ReplyDemo() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <GlassPanel className="overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between">
          <StickyLabel>Claude · génération contextuelle</StickyLabel>
          <motion.span
            animate={{ opacity: hovered ? 1 : 0.4 }}
            className="text-[10px] text-white/40"
          >
            {hovered ? "Réponse prête" : "Analyse en cours…"}
          </motion.span>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="rounded-lg border border-white/[0.05] bg-black/30 p-4">
          <p className="text-[11px] text-white/35">Post cible</p>
          <p className="mt-1 text-sm text-white/70">
            Best tool to market on Reddit without getting banned?
          </p>
          <p className="mt-1 text-[11px] text-white/35">r/SaaS · u/indie_founder</p>
        </div>
        <motion.div
          animate={{ opacity: hovered ? 1 : 0.5, y: hovered ? 0 : 4 }}
          transition={{ duration: 0.4 }}
          className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4"
        >
          <p className="text-[11px] text-primary/70">Réponse générée</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {hovered ? GENERATED_REPLY : "Génération en cours…"}
          </p>
        </motion.div>
      </div>
      </GlassPanel>
    </div>
  );
}

export function ShieldDemo() {
  const score = 0.12;
  const pct = score * 100;

  return (
    <GlassPanel className="p-6">
      <StickyLabel>Score anti-ban</StickyLabel>
      <div className="mt-8 flex items-end justify-between">
        <div>
          <p className="text-5xl font-semibold tracking-tight text-white">{score}</p>
          <p className="mt-1 text-sm text-white/40">Risque minimal</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-white/30">Seuil</p>
          <p className="text-sm text-white/50">0.60 max</p>
        </div>
      </div>
      <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 via-primary/60 to-red-500/40"
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Liens", ok: true },
          { label: "Ton", ok: true },
          { label: "Fréquence", ok: true },
        ].map((check) => (
          <div
            key={check.label}
            className="rounded-lg border border-white/[0.05] bg-white/[0.02] py-3"
          >
            <p className="text-[10px] text-white/35">{check.label}</p>
            <p className="mt-1 text-xs text-emerald-400/90">✓ validé</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

export function ScheduleDemo() {
  const months = ["FÉV", "MAR", "AVR", "MAI", "JUN"];
  return (
    <GlassPanel className="overflow-hidden p-5">
      <StickyLabel>Planification optimale</StickyLabel>
      <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
        {months.map((m) => (
          <span
            key={m}
            className="shrink-0 text-[10px] font-medium tracking-wider text-white/25"
          >
            {m}
          </span>
        ))}
      </div>
      <div className="relative mt-4 space-y-5">
        {[
          { label: "r/SaaS · reply", width: "45%", offset: "8%" },
          { label: "r/startups · post", width: "55%", offset: "25%" },
          { label: "r/growth · reply", width: "35%", offset: "55%" },
        ].map((bar, i) => (
          <motion.div
            key={bar.label}
            initial={{ opacity: 0, scaleX: 0 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.6 }}
            style={{ marginLeft: bar.offset, width: bar.width, originX: 0 }}
            className="relative"
          >
            <div className="h-9 rounded-lg border border-white/[0.06] bg-gradient-to-r from-white/[0.08] to-white/[0.02] px-3 flex items-center">
              <span className="text-[11px] text-white/50">{bar.label}</span>
            </div>
            <motion.span
              className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border border-primary/50 bg-primary/30"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 + 0.4 }}
            />
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}
