"use client";

import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { api } from "@/trpc/react";

export default function AnalyticsPage() {
  const { data, isLoading, refetch } = api.team.getDashboard.useQuery();
  const refresh = api.team.refreshDashboard.useMutation({
    onSuccess: () => void refetch(),
  });

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[#888888]">
        Chargement…
      </div>
    );
  }

  return (
    <AnalyticsDashboard
      data={data}
      title="Analytics"
      onRefresh={() => refresh.mutate()}
      isRefreshing={refresh.isPending}
    />
  );
}
