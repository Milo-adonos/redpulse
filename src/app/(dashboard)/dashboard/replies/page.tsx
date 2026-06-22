"use client";

import { useState } from "react";
import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { api } from "@/trpc/react";

export default function RepliesPage() {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const { data: items = [], isLoading, refetch, isFetching } =
    api.messages.list.useQuery({ type: "reply", unseenOnly: true });

  const sync = api.messages.syncReply.useMutation({
    onSuccess: (result) => {
      setSyncError(null);
      setSyncNotice(
        result.created > 0
          ? `${result.created} réponse(s) générée(s) — posts ICP dans vos subreddits.`
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
      title="Reply"
      description="Posts ICP dans vos subreddits (Settings) — réponses avec mention naturelle de votre produit."
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
