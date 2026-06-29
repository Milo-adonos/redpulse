"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function OnboardingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#080808]">
      <header className="flex justify-center px-5 py-8">
        <Link href="/">
          <Logo theme="light" />
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center px-5 pb-12">{children}</main>
    </div>
  );
}
