"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const links = [
  { href: "#start", label: "Démarrer" },
  { href: "#discover", label: "Produit" },
  { href: "#vision", label: "Vision" },
];

export function LandingNav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.04] bg-black/40 backdrop-blur-2xl"
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/">
          <Logo theme="light" />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[13px] text-white/50 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[13px] text-white/60 transition-colors hover:text-white sm:inline-block"
          >
            Connexion
          </Link>
          <Link
            href="/dashboard"
            className={cn(
              "rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black",
              "transition-all hover:bg-white/90 hover:shadow-glow-white",
            )}
          >
            Explorer
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
