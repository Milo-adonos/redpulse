"use client";

import { ScraperStatus } from "@/components/dashboard/scraper-status";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#080808]">
      <DashboardSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-[#1a1a1a] bg-[#080808] px-5 md:px-8">
          <ScraperStatus />
        </header>
        <main className="flex-1 overflow-auto p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
