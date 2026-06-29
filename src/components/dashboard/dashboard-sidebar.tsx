"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Flame,
  MessageSquare,
  Settings,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/replies", label: "Reply", icon: MessageSquare },
  { href: "/dashboard/warmup", label: "Warmup", icon: Flame },
  { href: "/dashboard/influence", label: "Influence", icon: Sparkles },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const { data: ctx } = api.team.getContext.useQuery();

  const firstName = ctx?.user?.firstName ?? ctx?.user?.name?.split(" ")[0] ?? "U";
  const displayName =
    [ctx?.user?.firstName, ctx?.user?.lastName].filter(Boolean).join(" ") ||
    ctx?.user?.name ||
    "Utilisateur";
  const initial = firstName.charAt(0).toUpperCase();

  const messagesUsed = ctx?.plan?.messagesUsed ?? 0;
  const messagesLimit = ctx?.plan?.messagesLimit ?? 200;
  const progress = messagesLimit > 0 ? Math.min(messagesUsed / messagesLimit, 1) : 0;
  const planName = ctx?.plan?.name ?? "Starter";

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[#1a1a1a] bg-[#080808] md:flex">
      <div className="border-b border-[#1a1a1a] px-4 py-5">
        <Link href="/dashboard">
          <Logo theme="light" />
        </Link>
      </div>

      <div className="mx-3 mt-3">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md bg-[#1a1a1a] px-3 py-2 text-[13px] text-white transition-colors duration-150 ease-in-out hover:bg-[#222222]"
        >
          <span className="truncate">{ctx?.project?.name ?? "Mon projet"}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-[#666666]" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-2">
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
                "mb-0.5 flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-all duration-150 ease-in-out",
                active
                  ? "bg-[#1a1a1a] font-medium text-white"
                  : "text-[#666666] hover:bg-[#141414] hover:text-[#aaaaaa]",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-[#f97316]" : "text-[#444444]",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#1a1a1a] px-3 py-4">
        <div className="mb-3 rounded-lg bg-[#141414] p-3">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-[#f97316]/15 px-2 py-0.5 text-[11px] font-medium text-[#f97316]">
              {planName}
            </span>
            <Link
              href="/onboarding/pricing"
              className="text-[11px] text-[#666666] transition-colors duration-150 ease-in-out hover:text-[#aaaaaa]"
            >
              Upgrade
            </Link>
          </div>
          <p className="mt-2 text-[12px] text-[#666666]">Messages ce mois</p>
          <div className="mt-2 h-1 overflow-hidden rounded-sm bg-[#1a1a1a]">
            <div
              className="h-full rounded-sm bg-[#f97316] transition-all duration-150 ease-in-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[12px] text-[#888888]">
            {messagesUsed} / {messagesLimit} messages
          </p>
        </div>

        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-md px-1 py-1 transition-colors duration-150 ease-in-out hover:bg-[#141414]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[13px] font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-[13px] text-white">{displayName}</p>
            <p className="truncate text-[11px] text-[#666666]">{ctx?.user?.email}</p>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-[#666666] transition-transform duration-150 ease-in-out",
              profileOpen && "rotate-90",
            )}
          />
        </button>

        {profileOpen && (
          <div className="mt-1 space-y-0.5 pl-11">
            <Link
              href="/dashboard/settings"
              className="block rounded-md px-2 py-1.5 text-[12px] text-[#666666] transition-colors duration-150 ease-in-out hover:bg-[#141414] hover:text-white"
            >
              Paramètres
            </Link>
            <Link
              href="/api/auth/signout"
              className="block rounded-md px-2 py-1.5 text-[12px] text-[#666666] transition-colors duration-150 ease-in-out hover:bg-[#141414] hover:text-white"
            >
              Déconnexion
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
