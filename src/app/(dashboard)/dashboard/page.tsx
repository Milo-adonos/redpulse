"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StatWidget } from "@/components/dashboard/stat-widget";
import { PageHeader } from "@/components/dashboard/data-list";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-white/40">
          Chargement de votre espace…
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

  const { data, isLoading } = api.team.getOverview.useQuery();
  const acceptInvite = api.team.acceptInvite.useMutation();

  useEffect(() => {
    if (inviteToken) acceptInvite.mutate({ token: inviteToken });
  }, [inviteToken]);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/40">
        Chargement de votre espace…
      </div>
    );
  }

  const { sentCount, generatedCount, subredditSplit, teamActivity } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Statistiques réelles issues de votre activité RedPulse."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatWidget
          label="Messages envoyés"
          value={String(sentCount)}
          delta="Cochés comme envoyés"
          trend={sentCount > 0 ? "up" : "neutral"}
          data={[sentCount]}
        />
        <StatWidget
          label="Messages générés"
          value={String(generatedCount)}
          delta="Reply & Warmup"
          trend={generatedCount > 0 ? "up" : "neutral"}
          data={[generatedCount]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white/80">Répartition par subreddit</h2>
          <p className="mt-1 text-[12px] text-white/35">Messages marqués comme envoyés</p>
          <div className="mt-4 space-y-3">
            {subredditSplit.length ? (
              subredditSplit.map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-white/50">{s.name}</span>
                    <span className="text-white/70">
                      {s.count} · {s.pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-white/35">{ux.empty.discovery.body}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-sm font-medium text-white/80">Activité de la team</h2>
          <p className="mt-1 text-[12px] text-white/35">Messages envoyés par membre</p>
          <div className="mt-4 space-y-3">
            {teamActivity.length ? (
              teamActivity.map((m) => (
                <div
                  key={m.email}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] px-4 py-3"
                >
                  <div>
                    <p className="text-[13px] font-medium text-white/80">{m.name}</p>
                    <p className="text-[11px] text-white/35">{m.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] capitalize text-white/50">{m.role}</p>
                    <p className="text-[13px] text-white/70">{m.messagesSent} envoyés</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-white/35">{ux.empty.team.body}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
