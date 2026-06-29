"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { motion } from "framer-motion";

export function VisionSection() {
  return (
    <section id="vision" className="relative scroll-mt-24 py-32 sm:py-40">
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/35">
            Vision
          </p>
          <blockquote className="mt-8 text-2xl font-medium leading-snug tracking-[-0.02em] text-white sm:text-3xl lg:text-4xl">
            &ldquo;Reddit n&apos;attend pas qu&apos;on crie plus fort.
            <br />
            <span className="text-white/45">
              Il récompense ceux qui arrivent au bon moment, avec les bons mots.&rdquo;
            </span>
          </blockquote>
          <p className="mx-auto mt-8 max-w-lg text-base text-white/40">
            RedPulse est l&apos;infrastructure invisible derrière les marques qui
            transforment Reddit en canal d&apos;acquisition durable.
          </p>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[14px] font-medium text-black transition-all hover:shadow-glow-white"
            >
              Entrer dans RedPulse
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/signup"
              className="text-[14px] text-white/45 transition-colors hover:text-white"
            >
              Créer un accès
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-5 sm:flex-row sm:px-8">
        <Link href="/">
          <Logo theme="light" variant="icon" />
        </Link>
        <p className="text-[12px] text-white/30">
          © {new Date().getFullYear()} RedPulse · Intelligence Reddit
        </p>
        <div className="flex gap-6 text-[12px] text-white/35">
          <a
            href="mailto:hello@redpulse.app"
            className="transition-colors hover:text-white/70"
          >
            Contact
          </a>
          <Link href="#" className="transition-colors hover:text-white/70">
            Confidentialité
          </Link>
          <a
            href="mailto:support@redpulse.app"
            className="transition-colors hover:text-white/70"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}
