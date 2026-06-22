"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { GlassPanel } from "./glass-panel";
import { StickyLabel } from "./scroll-chapter";

const streamItems = [
  { sub: "r/SaaS", title: "Best way to reach early adopters?", match: true, delay: 0 },
  { sub: "r/startups", title: "How do you validate on Reddit?", match: true, delay: 0.15 },
  { sub: "r/marketing", title: "Organic growth without ads", match: false, delay: 0.3 },
];

export function DiscoverDemo() {
  return (
    <GlassPanel className="overflow-hidden p-1">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <StickyLabel>Live stream · 3 subreddits</StickyLabel>
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
              <div>
                <span className="text-[11px] font-medium text-primary">{item.sub}</span>
                <p className="mt-1 text-sm text-white/80">{item.title}</p>
              </div>
              {item.match && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: item.delay + 0.2 }}
                  className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary"
                >
                  match
                </motion.span>
              )}
            </div>
            <motion.div
              className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/5"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ delay: item.delay + 0.3, duration: 0.8 }}
            >
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary/60 to-transparent" />
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
            What tools do you use for Reddit marketing?
          </p>
        </div>
        <motion.div
          animate={{ opacity: hovered ? 1 : 0.5, y: hovered ? 0 : 4 }}
          transition={{ duration: 0.4 }}
          className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4"
        >
          <p className="text-[11px] text-primary/70">Réponse générée</p>
          <p className="mt-2 text-sm leading-relaxed text-white/75">
            {hovered
              ? "J'ai testé plusieurs approches — ce qui fonctionne vraiment, c'est d'être présent au bon moment. RedPulse m'aide à repérer les threads pertinents sans passer mes journées à scroller."
              : "Génération en cours…"}
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
