"use client";

import { useState } from "react";
import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { api } from "@/trpc/react";

export default function WarmupPage() {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const { data: items = [], isLoading, refetch, isFetching } = api.messages.list.useQuery(
    { type: "warmup", unseenOnly: true },
  );

  const sync = api.messages.syncWarmup.useMutation({
    onSuccess: (result) => {
      setSyncError(null);
      setSyncNotice(
        result.created > 0
          ? `${result.created} message(s) warmup — niche ICP, sans promo.`
          : "Aucun nouveau post ICP — réessayez plus tard ou ajustez vos mots-clés.",
      );
      void refetch();
      setTimeout(() => setSyncNotice(null), 5000);
    },
    onError: (e) => {
      setSyncNotice(null);
      setSyncError(e.message);
    },
  });
  const toggle = api.messages.toggleSent.useMutation({ onSuccess: () => refetch() });
  const markViewed = api.messages.markViewed.useMutation({ onSuccess: () => refetch() });

  return (
    <RedditMessageWorkspace
      title="Warmup"
      description="Posts ICP dans vos subreddits — commentaires naturels sans mentionner votre produit."
      items={items}
      isLoading={isLoading || isFetching}
      isSyncing={sync.isLoading}
      syncError={syncError}
      syncNotice={syncNotice}
      onSync={() => sync.mutate()}
      onToggleSent={(id, isSent) => toggle.mutate({ id, isSent })}
      onMarkViewed={(id) => markViewed.mutate({ id })}
    />
  );
}
