"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

type MessageType = "reply" | "warmup";

const listInput = (type: MessageType) =>
  ({ type, pendingOnly: true }) as const;

export function useRedditMessageWorkspace(type: MessageType) {
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const utils = api.useUtils();

  const { data: items = [], isLoading, refetch } = api.messages.list.useQuery(
    listInput(type),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
    },
  );

  const syncMutation =
    type === "reply"
      ? api.messages.syncReply.useMutation({
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
        })
      : api.messages.syncWarmup.useMutation({
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

  const toggleSent = api.messages.toggleSent.useMutation({
    onMutate: async ({ id, isSent }) => {
      await utils.messages.list.cancel(listInput(type));
      const previous = utils.messages.list.getData(listInput(type));
      utils.messages.list.setData(listInput(type), (current) => {
        if (!current) return current;
        if (isSent) {
          return current.filter((item) => item.id !== id);
        }
        return current.map((item) =>
          item.id === id ? { ...item, isSent: false } : item,
        );
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        utils.messages.list.setData(listInput(type), context.previous);
      }
    },
  });

  return {
    items,
    isLoading,
    syncError,
    syncNotice,
    isSyncing: syncMutation.isPending,
    onSync: () => syncMutation.mutate(),
    onToggleSent: (id: string, isSent: boolean) =>
      toggleSent.mutate({ id, isSent }),
  };
}
