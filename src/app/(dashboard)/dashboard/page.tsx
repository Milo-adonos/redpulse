"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AnalyticsDashboard } from "@/components/dashboard/analytics-dashboard";
import { api } from "@/trpc/react";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-[#888888]">
          Chargement…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const { data, isLoading, refetch } = api.team.getDashboard.useQuery();
  const refresh = api.team.refreshDashboard.useMutation({
    onSuccess: () => void refetch(),
  });
  const acceptInvite = api.team.acceptInvite.useMutation();

  useEffect(() => {
    if (inviteToken) acceptInvite.mutate({ token: inviteToken });
  }, [inviteToken]);

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
      title="Dashboard"
      onRefresh={() => refresh.mutate()}
      isRefreshing={refresh.isPending}
    />
  );
}
