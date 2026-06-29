"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FeaturesShowcase } from "./features-showcase";
import { ux } from "@/lib/ux-copy";

function isValidDomain(input: string): boolean {
  const trimmed = input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./i, "");

  if (!trimmed || trimmed.length > 253) return false;

  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    trimmed,
  );
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (!trimmed) return "";
  return `https://${trimmed}`;
}

export function LandingHero() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!isValidDomain(url)) {
      setError("Entrez un domaine valide (ex. makemynails.app)");
      return;
    }

    const normalized = normalizeUrl(url);
    try {
      sessionStorage.setItem("redpulse:onboarding-url", normalized);
    } catch {
      // ignore
    }
    router.push(`/onboarding/analyzing?url=${encodeURIComponent(normalized)}`);
  }

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-16"
    >
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

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 flex w-full max-w-[560px] flex-col items-stretch gap-3 sm:flex-row"
          >
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="makemynails.app"
              className="w-full rounded-lg border border-white/[0.08] bg-black/50 px-5 py-4 text-[16px] text-white outline-none transition-[border-color,box-shadow] duration-150 ease-in-out placeholder:text-white/25 focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/20"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-[#f97316] px-6 py-4 text-[15px] font-medium text-white transition-colors duration-150 ease-in-out hover:bg-[#ea6c0a] sm:whitespace-nowrap"
            >
              Analyser →
            </button>
          </form>

          {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}

          <p className="mt-3 text-[13px] text-[#666666]">
            Analyse gratuite · 30 secondes
          </p>
        </motion.div>
      </div>

      <FeaturesShowcase />
    </section>
  );
}
