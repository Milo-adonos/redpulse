"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { FeaturesDropdown } from "@/components/landing/features-dropdown";
import { cn } from "@/lib/utils";

const MOBILE_FEATURES = [
  { href: "/features#reply", label: "Reply" },
  { href: "/features#warmup", label: "Warmup" },
  { href: "/features#influence", label: "Influence" },
  { href: "/features#analytics", label: "Analytics" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <FeaturesDropdown />
          <Link
            href="/pricing"
            className="text-[13px] text-white/50 transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/customers"
            className="text-[13px] text-white/50 transition-colors hover:text-white"
          >
            Customers
          </Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-[13px] text-white/60 transition-colors hover:text-white sm:inline-block"
          >
            Connexion
          </Link>
          <Link
            href="/#hero"
            className={cn(
              "rounded-lg bg-[#f97316] px-4 py-2 text-[13px] font-medium text-white",
              "transition-all hover:bg-[#ea6c0a]",
            )}
          >
            Commencer
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/[0.06] bg-black/95 px-5 py-4 backdrop-blur-xl md:hidden">
          <div className="space-y-4">
            <div>
              <Link
                href="/features"
                onClick={() => setMobileOpen(false)}
                className="text-[14px] font-medium text-white"
              >
                Features
              </Link>
              <div className="mt-2 space-y-1 pl-3">
                {MOBILE_FEATURES.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-1.5 text-[13px] text-white/50 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="block text-[14px] text-white/70 transition-colors hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="/customers"
              onClick={() => setMobileOpen(false)}
              className="block text-[14px] text-white/70 transition-colors hover:text-white"
            >
              Customers
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="block text-[14px] text-white/70 transition-colors hover:text-white sm:hidden"
            >
              Connexion
            </Link>
          </div>
        </div>
      )}
    </motion.header>
  );
}
