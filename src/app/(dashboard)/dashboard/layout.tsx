"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Flame,
  MessageSquare,
  Users,
  Settings,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ScraperStatus } from "@/components/dashboard/scraper-status";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/replies", label: "Reply", icon: MessageSquare },
  { href: "/dashboard/warmup", label: "Warmup", icon: Flame },
  { href: "/dashboard/team", label: "Team", icon: Users },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[hsl(var(--surface-cold))] md:flex">
        <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
          <Link href="/">
            <Logo theme="light" />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-200",
                  active
                    ? "bg-white/[0.08] font-medium text-white shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]"
                    : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-white/30",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/[0.06] p-3">
          <Link
            href="/"
            className="flex items-center justify-center rounded-xl border border-white/[0.06] px-3 py-2.5 text-[13px] text-white/40 transition-colors hover:border-white/10 hover:text-white/70"
          >
            ← Site
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/80 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-white/60 md:hidden">RedPulse</p>
            <ScraperStatus />
          </div>
          <UserMenu />
        </header>
        <main className="flex-1 overflow-auto p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
