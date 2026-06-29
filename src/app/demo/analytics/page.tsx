"use client";

import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { DEMO_ANALYTICS_DATA } from "@/lib/demo/mock-data";

export default function DemoAnalyticsPage() {
  return (
    <div id="screenshot-target" className="mx-auto w-[1280px] px-8 py-6">
      <AnalyticsDashboard data={DEMO_ANALYTICS_DATA} title="Dashboard" />
    </div>
  );
}
