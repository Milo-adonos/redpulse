"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassPanel } from "./glass-panel";
import { ux } from "@/lib/ux-copy";

export function LandingHero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center px-5 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-4xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {ux.brand.tagline}
          </span>

          <h1 className="mt-8 text-balance text-[clamp(2.75rem,7.5vw,5rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
            Reddit devient votre{" "}
            <span className="relative inline-block text-primary">
              avantage
              <motion.span
                className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-primary to-transparent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              />
            </span>
            .
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/45 sm:text-xl">
            Détectez les conversations qui comptent. Répondez avec précision.
            Protégez votre réputation — sans bruit, sans risque.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="#start"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-[15px] font-semibold text-black transition-all hover:bg-white/90 hover:shadow-glow-white"
            >
              {ux.cta.start}
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </a>
            <Link
              href="/dashboard"
              className="text-[13px] text-white/35 transition-colors hover:text-white/60"
            >
              {ux.cta.explore} · sans configuration
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 w-full max-w-5xl sm:mt-24"
        >
          <GlassPanel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-[11px] text-white/30">redpulse.app · dashboard</span>
            </div>
            <div className="grid gap-px bg-white/[0.04] md:grid-cols-3">
              {[
                { label: "Conversations", value: "2,847", delta: "Listen · temps réel" },
                { label: "ROI estimé", value: "8.4×", delta: "Analyze · vs. manuel" },
                { label: "Risque ban", value: "0.12", delta: "Publish · contrôlé" },
              ].map((stat) => (
                <div key={stat.label} className="neu-inset bg-black/40 p-6">
                  <p className="text-[11px] uppercase tracking-wider text-white/35">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[12px] text-primary/80">{stat.delta}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}
