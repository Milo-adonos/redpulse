"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FeaturesShowcase } from "./features-showcase";
import { HeroFeaturesTransition } from "./hero-features-transition";
import { KeyFeatures } from "./key-features";

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
    <>
      <section
        id="hero"
        className="relative overflow-hidden bg-[#080808] pb-20 pt-[120px]"
      >
        <div className="relative mx-auto w-full max-w-6xl px-5 text-center sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl"
          >
          <h1 className="text-balance text-[clamp(2.75rem,8vw,5.25rem)] font-bold leading-[1.02] tracking-[-0.045em] text-white">
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

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/45 sm:text-lg">
            Détectez les conversations qui comptent. Répondez avec précision.
            Protégez votre réputation sans bruit et sans risque.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-6 flex w-full max-w-[560px] flex-col items-stretch gap-3 sm:flex-row"
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

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(249, 115, 22, 0.03))",
          }}
          aria-hidden
        />
      </section>

      <HeroFeaturesTransition />
      <FeaturesShowcase />
      <KeyFeatures />
    </>
  );
}
