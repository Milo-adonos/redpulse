"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import type { MessageItem } from "@/components/dashboard/reddit-message-workspace";
import { MESSAGE_LIMIT_ERROR } from "@/lib/plan-errors";

export type SectionType = "reply" | "warmup" | "influence";
export type SectionTab = "a_traiter" | "traites";

const listInput = (type: SectionType, tab: SectionTab) =>
  ({ type, tab }) as const;

export function useSectionWorkspace(type: SectionType) {
  const [tab, setTab] = useState<SectionTab>("a_traiter");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [generatingForPost, setGeneratingForPost] = useState<string | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const utils = api.useUtils();

  const { data: teamCtx } = api.team.getContext.useQuery();
  const messagesLimit = teamCtx?.plan?.messagesLimit ?? 200;

  function handleLimitError(message: string) {
    if (message === MESSAGE_LIMIT_ERROR) {
      setLimitModalOpen(true);
      return;
    }
    setSyncError(message);
  }

  const { data: pendingItems = [] } = api.messages.list.useQuery(
    listInput(type, "a_traiter"),
    {
      enabled: tab === "traites",
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  );

  const { data: items = [], isLoading, refetch } = api.messages.list.useQuery(
    listInput(type, tab),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30_000,
    },
  );

  const syncReply = api.messages.syncReply.useMutation();
  const syncWarmup = api.messages.syncWarmup.useMutation();
  const syncInfluence = api.messages.syncInfluence.useMutation();
  const generateForPost = api.messages.generateForPost.useMutation();
  const regenerate = api.messages.regenerate.useMutation({
    onSuccess: (result) => {
      void refetch();
      utils.messages.list.setData(listInput(type, tab), (current) => {
        if (!current) return current;
        return current.map((item) =>
          item.id === result.id
            ? {
                ...item,
                generatedBody: result.generatedBody,
                safetyScore: result.safetyScore,
                styleConfidence: result.styleConfidence,
                hasVoiceProfile: result.hasVoiceProfile,
              }
            : item,
        ) as typeof current;
      });
      void utils.team.getContext.invalidate();
    },
    onError: (e) => handleLimitError(e.message),
  });

  const syncMutation =
    type === "reply" ? syncReply : type === "warmup" ? syncWarmup : syncInfluence;

  const toggleSent = api.messages.toggleSent.useMutation({
    onSuccess: () => {
      void utils.messages.list.invalidate({ type });
    },
    onError: (e) => handleLimitError(e.message),
  });

  function handleSync() {
    syncMutation.mutate(undefined, {
      onSuccess: (result) => {
        setSyncError(null);
        setSyncNotice(
          result.scraped > 0
            ? `${result.scraped} posts en base, ${result.eligible} éligibles.`
            : "Actualisation terminée.",
        );
        void refetch();
        void utils.messages.list.invalidate({ type });
        setTimeout(() => setSyncNotice(null), 5000);
      },
      onError: (e) => {
        setSyncNotice(null);
        setSyncError(e.message);
      },
    });
  }

  function handleGenerateForPost(postRedditId: string) {
    if (generatingForPost === postRedditId) return;
    setGeneratingForPost(postRedditId);
    generateForPost.mutate(
      { postRedditId, type },
      {
        onSuccess: (result) => {
          utils.messages.list.setData(listInput(type, tab), (current) => {
            if (!current) return current;
            return current.map((item) =>
              item.redditId === postRedditId
                ? {
                    ...item,
                    id: result.id,
                    generatedBody: result.generatedBody,
                    safetyScore: result.safetyScore,
                    styleConfidence: result.styleConfidence,
                    hasVoiceProfile: result.hasVoiceProfile,
                  }
                : item,
            ) as typeof current;
          });
          setGeneratingForPost(null);
          void utils.team.getContext.invalidate();
        },
        onError: (e) => {
          handleLimitError(e.message);
          setGeneratingForPost(null);
        },
      },
    );
  }

  function handleSelectPost(postRedditId: string, hasMessage: boolean) {
    if (!hasMessage && tab === "a_traiter") {
      handleGenerateForPost(postRedditId);
    }
  }

  return {
    tab,
    setTab,
    queueCount: tab === "a_traiter" ? items.length : pendingItems.length,
    items: items as MessageItem[],
    isLoading,
    syncError,
    syncNotice,
    isSyncing: syncMutation.isPending,
    isRegenerating: regenerate.isPending,
    isGenerating: generatingForPost !== null,
    generatingForPost,
    onSync: handleSync,
    onToggleSent: (id: string, isSent: boolean, redditId?: string) =>
      toggleSent.mutate({ id, isSent, redditId, type }),
    onRegenerate: (id: string) => regenerate.mutate({ id }),
    onGenerateForPost: handleGenerateForPost,
    onSelectPost: handleSelectPost,
    limitModalOpen,
    setLimitModalOpen,
    messagesLimit,
  };
}
