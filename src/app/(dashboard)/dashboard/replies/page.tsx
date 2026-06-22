"use client";

import { useEffect, useRef, useState } from "react";
import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { api } from "@/trpc/react";

export default function RepliesPage() {
  const [syncError, setSyncError] = useState<string | null>(null);
  const { data: items = [], isLoading, refetch } = api.messages.list.useQuery(
    { type: "reply" },
    { refetchInterval: 60_000 },
  );
  const sync = api.messages.syncReply.useMutation({
    onSuccess: () => {
      setSyncError(null);
      refetch();
    },
    onError: (e) => setSyncError(e.message),
  });
  const toggle = api.messages.toggleSent.useMutation({ onSuccess: () => refetch() });

  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current || isLoading) return;
    if (items.length === 0) {
      bootstrapped.current = true;
      sync.mutate();
    }
  }, [isLoading, items.length]);

  return (
    <RedditMessageWorkspace
      title="Reply & DM"
      description="Conversations Reddit pertinentes — mises à jour automatiquement toutes les 15 min."
      items={items}
      isLoading={isLoading}
      isSyncing={sync.isLoading}
      syncError={syncError}
      onSync={() => sync.mutate()}
      onToggleSent={(id, isSent) => toggle.mutate({ id, isSent })}
    />
  );
}
