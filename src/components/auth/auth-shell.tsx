"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100svh] flex-col bg-black">
      <div className="pointer-events-none absolute inset-0 bg-hero-mesh" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      <header className="relative z-10 flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/">
          <Logo theme="light" />
        </Link>
        <Link
          href="/"
          className="text-[13px] text-white/40 transition-colors hover:text-white/70"
        >
          ← Retour
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-12">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-white/40">{subtitle}</p>
        </div>

        <div className="w-full max-w-[420px] rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 shadow-glass backdrop-blur-xl sm:p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-sm text-white/40">{footer}</div>
      </main>
    </div>
  );
}

export function SocialAuthButtons() {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] py-3.5 text-[13px] text-white/80 transition-all hover:border-white/20 hover:bg-white/[0.06]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </button>
      <button
        type="button"
        disabled
        className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-white/[0.04] py-3.5 text-[13px] text-white/25"
      >
        Continuer avec Apple — bientôt
      </button>
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-white/[0.06]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[#0A0A0B] px-3 text-[11px] uppercase tracking-wider text-white/30">
          ou
        </span>
      </div>
    </div>
  );
}
