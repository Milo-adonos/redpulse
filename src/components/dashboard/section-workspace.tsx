"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { MessageItem } from "@/components/dashboard/reddit-message-workspace";
import type { SectionTab, SectionType } from "@/components/dashboard/use-section-workspace";
import { ProfileInformationPanel } from "@/components/dashboard/profile-information-panel";
import {
  InfluenceSidePanel,
  WarmupSidePanel,
} from "@/components/dashboard/section-side-panels";
import { MessageLimitModal } from "@/components/dashboard/message-limit-modal";

const TABS: { id: SectionTab; label: string }[] = [
  { id: "a_traiter", label: "À traiter" },
  { id: "traites", label: "Traités" },
];

const TONES = ["Natural", "Casual", "Subtle"] as const;

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}j`;
}

function DotsLoader() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f97316]"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

function parseTags(item: MessageItem): string[] {
  if (item.banReason?.trim()) {
    return item.banReason
      .split(/[,·|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return [];
}

interface SectionWorkspaceProps {
  title: string;
  sectionType: SectionType;
  tab: SectionTab;
  setTab: (tab: SectionTab) => void;
  queueCount: number;
  items: MessageItem[];
  isLoading: boolean;
  isSyncing: boolean;
  isRegenerating?: boolean;
  generatingForPost?: string | null;
  syncError?: string | null;
  syncNotice?: string | null;
  onSync: () => void;
  onToggleSent: (id: string, isSent: boolean, redditId?: string) => void;
  onRegenerate: (id: string) => void;
  onSelectPost: (redditId: string, hasMessage: boolean) => void;
  limitModalOpen?: boolean;
  setLimitModalOpen?: (open: boolean) => void;
  messagesLimit?: number;
  demoMode?: {
    postingUsername: string;
    postingKarma: number;
    sidePanel: React.ReactNode;
    initialSelectedRedditId: string;
  };
}

export function SectionWorkspace({
  title,
  sectionType,
  tab,
  setTab,
  queueCount,
  items,
  isLoading,
  isSyncing,
  isRegenerating,
  generatingForPost,
  syncError,
  syncNotice,
  onSync,
  onToggleSent,
  onRegenerate,
  onSelectPost,
  limitModalOpen,
  setLimitModalOpen,
  messagesLimit = 200,
  demoMode,
}: SectionWorkspaceProps) {
  const [selectedRedditId, setSelectedRedditId] = useState<string | null>(
    demoMode?.initialSelectedRedditId ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [activeTone, setActiveTone] = useState<(typeof TONES)[number]>("Natural");

  const { data: dashboard } = api.team.getDashboard.useQuery(undefined, {
    staleTime: 60_000,
    enabled: !demoMode,
  });
  const utils = api.useUtils();

  const selected = items.find((i) => i.redditId === selectedRedditId) ?? null;
  const isGeneratingSelected =
    !!selected &&
    generatingForPost === selected.redditId &&
    !selected.generatedBody;

  const replyLabel =
    sectionType === "warmup"
      ? "Warmup comment"
      : sectionType === "influence"
        ? "Influence reply"
        : "AI suggested reply";

  function selectItem(item: MessageItem) {
    setSelectedRedditId(item.redditId);
    onSelectPost(item.redditId, !!item.generatedBody);
  }

  async function copyAndSend(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const postingUsername = demoMode?.postingUsername ?? dashboard?.redditUsername ?? "your_account";
  const postingKarma = demoMode?.postingKarma ?? dashboard?.reddit?.totalKarma ?? null;

  useEffect(() => {
    if (selectedRedditId && !items.some((i) => i.redditId === selectedRedditId)) {
      setSelectedRedditId(null);
    }
  }, [items, selectedRedditId]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#080808] pb-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-semibold text-white">{title}</h1>
            <span className="rounded-md bg-[#1a1a1a] px-2.5 py-1 text-[12px] text-[#888888]">
              {queueCount} in queue
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setSelectedRedditId(null);
                }}
                className={cn(
                  "rounded-lg px-4 py-2 text-[13px] transition-all duration-150 ease-out",
                  tab === t.id
                    ? "bg-[#1a1a1a] text-white"
                    : "text-[#888888] hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 rounded-lg border border-[#222222] px-4 py-2 text-[13px] text-[#888888] transition-all duration-150 ease-out hover:border-[#333333] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
          {isSyncing ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      {syncNotice && (
        <div className="mb-3 rounded-lg border border-[#28c840]/20 bg-[#28c840]/10 px-4 py-2 text-[12px] text-[#28c840]">
          {syncNotice}
        </div>
      )}
      {syncError && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-[12px] text-red-400">
          {syncError}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center text-[#888888]">
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[50vh] items-center justify-center rounded-lg border border-dashed border-[#1a1a1a]">
          <div className="text-center">
            <p className="text-[#888888]">Aucun post dans cet onglet</p>
            <p className="mt-1 text-[12px] text-[#444444]">
              Cliquez sur Actualiser pour scraper Reddit.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13fr_7fr] lg:items-start">
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-1">
            {items.map((item) => {
              const expanded = selectedRedditId === item.redditId;
              const tags = parseTags(item);
              const generating =
                generatingForPost === item.redditId && !item.generatedBody;

              return (
                <div
                  key={item.redditId}
                  className={cn(
                    "mb-2 rounded-lg border border-[#1a1a1a] p-4 transition-all duration-150 ease-out",
                    expanded
                      ? "border-l-2 border-l-[#f97316] bg-[#161616]"
                      : "bg-[#111111] hover:bg-[#141414]",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => selectItem(item)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] text-[#888888]">
                        r/{item.subreddit} · u/{item.author} ·{" "}
                        {timeAgo(item.redditCreatedAt ?? item.createdAt)}
                      </p>
                      <div className="flex shrink-0 items-center gap-2 text-[12px]">
                        <span className="text-[#888888]">
                          {Math.round(item.relevanceScore ?? 0)}
                        </span>
                        {tab === "a_traiter" && !item.isSent && (
                          <span className="text-[#f97316]">new</span>
                        )}
                      </div>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-[16px] font-medium leading-snug text-white">
                      {item.title}
                    </h3>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-[#1a1a1a] px-2 py-0.5 text-[12px] text-[#888888]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 border-t border-[#222222] pt-4">
                          {item.postBody && (
                            <p className="line-clamp-3 text-[12px] italic leading-relaxed text-[#888888]">
                              {item.postBody}
                            </p>
                          )}

                          <div className="mt-3 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-[#f97316]" />
                                <span className="text-[13px] text-[#888888]">
                                  {replyLabel}
                                </span>
                                {sectionType === "influence" && (
                                  <span className="rounded-full border border-[rgba(249,115,22,0.2)] bg-[rgba(249,115,22,0.1)] px-2.5 py-0.5 text-[11px] text-[#f97316]">
                                    Curiosity mode
                                  </span>
                                )}
                              </div>
                              {item.generatedBody && (
                                <button
                                  type="button"
                                  onClick={() => onRegenerate(item.id)}
                                  disabled={isRegenerating}
                                  className="text-[12px] text-[#888888] transition-colors hover:text-white disabled:opacity-50"
                                >
                                  Try another
                                </button>
                              )}
                            </div>

                            {generating || isGeneratingSelected ? (
                              <div className="mt-4 flex items-center gap-3">
                                <DotsLoader />
                                <span className="text-[13px] text-[#888888]">
                                  Génération en cours...
                                </span>
                              </div>
                            ) : item.generatedBody ? (
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="mt-4 whitespace-pre-wrap text-[15px] leading-[1.7] text-[#e0e0e0]"
                              >
                                {item.generatedBody}
                              </motion.p>
                            ) : (
                              <p className="mt-4 text-[13px] text-[#444444]">
                                Génération en cours...
                              </p>
                            )}

                            {item.generatedBody && item.safetyScore != null && (
                              <p className="mt-3 inline-flex rounded-full bg-[#14532d] px-3.5 py-1.5 text-[13px] font-semibold text-[#22c55e]">
                                Anti-ban {item.safetyScore}/10
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                              {TONES.map((tone) => (
                                <button
                                  key={tone}
                                  type="button"
                                  onClick={() => setActiveTone(tone)}
                                  className={cn(
                                    "rounded-full px-3.5 py-1.5 text-[12px] transition-all duration-150 ease-out",
                                    activeTone === tone
                                      ? "border border-[#f97316] text-[#f97316]"
                                      : "border border-[#222222] text-[#888888]",
                                  )}
                                >
                                  {tone}
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#1a1a1a] pt-4">
                              <p className="text-[13px] text-[#888888]">
                                Posting as u/{postingUsername}
                                {postingKarma != null ? ` · ${postingKarma} karma` : ""}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRedditId(null)}
                                  className="rounded-full border border-[#222222] px-4 py-2 text-[12px] text-[#888888] transition-all duration-150 hover:text-white"
                                >
                                  Skip
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    window.open(item.permalink, "_blank", "noopener,noreferrer")
                                  }
                                  className="flex items-center gap-1.5 rounded-full border border-[#222222] px-4 py-2 text-[12px] text-[#888888] transition-all duration-150 hover:text-white"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Ouvrir Reddit
                                </button>
                                <button
                                  type="button"
                                  disabled={!item.generatedBody}
                                  onClick={() =>
                                    item.generatedBody && void copyAndSend(item.generatedBody)
                                  }
                                  className="flex items-center gap-1.5 rounded-full bg-[#f97316] px-5 py-2 text-[12px] font-medium text-white transition-all duration-150 disabled:opacity-40"
                                >
                                  {copied ? (
                                    <Check className="h-3.5 w-3.5" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  Copy & send
                                </button>
                                <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#888888]">
                                  <input
                                    type="checkbox"
                                    checked={item.isSent}
                                    disabled={!item.generatedBody}
                                    onChange={(e) => {
                                      onToggleSent(
                                        item.id,
                                        e.target.checked,
                                        item.redditId,
                                      );
                                      if (e.target.checked) {
                                        setSelectedRedditId(null);
                                        if (sectionType === "warmup") {
                                          void utils.warmup.getStats.invalidate();
                                        }
                                      }
                                    }}
                                    className="h-4 w-4 rounded border-[#222222] bg-transparent accent-[#f97316] disabled:opacity-40"
                                  />
                                  Envoyé ✓
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="sticky top-4 lg:max-h-[calc(100vh-8rem)]">
            {demoMode ? (
              demoMode.sidePanel
            ) : (
              <>
                {sectionType === "reply" && (
                  <ProfileInformationPanel
                    username={selected?.author}
                    subreddit={selected?.subreddit}
                    relevanceScore={selected?.relevanceScore}
                    redditScore={selected?.redditScore}
                    styleConfidence={selected?.styleConfidence}
                  />
                )}
                {sectionType === "warmup" && <WarmupSidePanel />}
                {sectionType === "influence" && <InfluenceSidePanel />}
              </>
            )}
          </div>
        </div>
      )}
      <MessageLimitModal
        open={limitModalOpen ?? false}
        onOpenChange={setLimitModalOpen ?? (() => {})}
        messagesLimit={messagesLimit}
      />
    </div>
  );
}
