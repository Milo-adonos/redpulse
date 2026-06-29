"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Copy, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type MessageItem = {
  id: string;
  redditId: string; // Added for lazy loading
  subreddit: string;
  title: string;
  author: string;
  permalink: string;
  postBody?: string | null;
  generatedBody: string | null; // Can be null when not generated yet
  relevanceScore: number | null;
  safetyScore: number | null; // Can be null when not generated yet
  banReason?: string | null;
  redditScore?: number | null;
  isSent: boolean;
  createdAt: Date | string;
  redditCreatedAt?: Date | string | null;
  styleConfidence?: number;
  hasVoiceProfile?: boolean;
};

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j`;
}

function relevanceLabel(score: number | null): string {
  if (score == null) return "—";
  return `${Math.round(score)}/100`;
}

interface RedditMessageWorkspaceProps {
  title: string;
  description: string;
  items: MessageItem[];
  isLoading: boolean;
  isSyncing: boolean;
  isRegenerating?: boolean;
  syncError?: string | null;
  syncNotice?: string | null;
  showRedditScore?: boolean;
  isPostSection?: boolean;
  onSync: () => void;
  onToggleSent: (id: string, isSent: boolean) => void;
  onRegenerate?: (id: string) => void;
}

export function RedditMessageWorkspace({
  title,
  description,
  items,
  isLoading,
  isSyncing,
  isRegenerating,
  syncError,
  syncNotice,
  showRedditScore = true,
  isPostSection = false,
  onSync,
  onToggleSent,
  onRegenerate,
}: RedditMessageWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }
    if (selectedId && items.some((item) => item.id === selectedId)) {
      return;
    }
    setSelectedId(items[0]!.id);
  }, [items, selectedId]);

  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  async function copyMessage(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openRedditLink(url: string) {
    if (isPostSection) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-white/40">{description}</p>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={isSyncing}
          className="shrink-0 rounded-full border border-white/10 px-5 py-2.5 text-[13px] text-white/70 transition-colors hover:border-primary/30 hover:text-white disabled:opacity-50"
        >
          {isSyncing ? "Actualisation…" : "↻ Actualiser"}
        </button>
      </div>

      {syncNotice && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300/90">
          {syncNotice}
        </div>
      )}

      {syncError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300/90">
          {syncError}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/40">
          Chargement…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <p className="text-lg font-medium text-white/60">Aucun nouveau message</p>
          <p className="mt-2 text-sm text-white/35">
            Cliquez sur Actualiser pour {isPostSection ? "générer des idées de posts" : "détecter de nouveaux posts Reddit"}.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[calc(100vh-12rem)] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-12rem)]">
            {items.map((item) => {
              const active = selected?.id === item.id;
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-2xl border text-left transition-all",
                    active
                      ? "border-primary/30 bg-primary/[0.06]"
                      : "border-white/[0.06] bg-white/[0.02] hover:border-white/10",
                  )}
                >
                  <div className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                      <span className="text-primary">r/{item.subreddit}</span>
                      <span>·</span>
                      {!isPostSection && (
                        <>
                          <span>u/{item.author}</span>
                          <span>·</span>
                        </>
                      )}
                      <span>{timeAgo(item.redditCreatedAt ?? item.createdAt)}</span>
                      {showRedditScore && item.redditScore != null && item.redditScore > 0 && (
                        <>
                          <span>·</span>
                          <span>↑ {item.redditScore}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>Pertinence {relevanceLabel(item.relevanceScore)}</span>
                    </div>
                    {!isPostSection ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRedditLink(item.permalink);
                        }}
                        className="mt-2 flex w-full items-start gap-1.5 text-left text-[14px] font-medium leading-snug text-white/90 hover:text-primary"
                      >
                        <span className="min-w-0 flex-1">{item.title}</span>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40" />
                      </button>
                    ) : (
                      <p className="mt-2 text-[14px] font-medium leading-snug text-white/90">
                        {item.title}
                      </p>
                    )}
                  </div>
                  <div className="border-t border-white/[0.04] px-4 py-3">
                    <p className="line-clamp-3 text-[13px] leading-relaxed text-white/65">
                      {item.generatedBody}
                    </p>
                    <div
                      className="mt-3 flex flex-wrap items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-white/50">
                        <input
                          type="checkbox"
                          checked={item.isSent}
                          onChange={(e) => onToggleSent(item.id, e.target.checked)}
                          className="rounded border-white/20 bg-black/40"
                        />
                        Message envoyé
                      </label>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px]",
                          (item.safetyScore ?? 0) >= 8
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300",
                        )}
                      >
                        Anti-ban {item.safetyScore ?? "—"}/10
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div className="sticky top-0 hidden rounded-2xl border border-white/[0.06] bg-[hsl(var(--surface-cold))] p-6 lg:block lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                <span className="text-primary">r/{selected.subreddit}</span>
                {!isPostSection && (
                  <>
                    <span>·</span>
                    <span>u/{selected.author}</span>
                  </>
                )}
                <span>·</span>
                <span>{timeAgo(selected.redditCreatedAt ?? selected.createdAt)}</span>
              </div>
              {!isPostSection ? (
                <button
                  type="button"
                  onClick={() => openRedditLink(selected.permalink)}
                  className="mt-3 flex w-full items-start gap-2 text-left text-lg font-medium leading-snug text-white hover:text-primary"
                >
                  {selected.title}
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 opacity-50" />
                </button>
              ) : (
                <h2 className="mt-3 text-lg font-medium leading-snug text-white">
                  {selected.title}
                </h2>
              )}
              {selected.postBody && !isPostSection && (
                <p className="mt-4 line-clamp-6 text-[13px] leading-relaxed text-white/45">
                  {selected.postBody}
                </p>
              )}
              {isPostSection && selected.postBody && (
                <p className="mt-4 text-[13px] leading-relaxed text-white/45">
                  {selected.postBody}
                </p>
              )}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-wider text-white/35">
                    Message prêt à copier
                  </p>
                  <div className="flex items-center gap-3">
                    {onRegenerate && (
                      <button
                        type="button"
                        disabled={isRegenerating || !selected.generatedBody}
                        onClick={() => onRegenerate(selected.id)}
                        className="flex items-center gap-1.5 text-[12px] text-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", isRegenerating && "animate-spin")} />
                        Regénérer
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!selected.generatedBody}
                      onClick={() => selected.generatedBody && copyMessage(selected.generatedBody)}
                      className="flex items-center gap-1.5 text-[12px] text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copié" : "Copier le message"}
                    </button>
                  </div>
                </div>
                {selected.generatedBody ? (
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-white/80">
                    {selected.generatedBody}
                  </p>
                ) : (
                  <p className="mt-3 text-[14px] text-white/40">
                    Click on this post to generate a message...
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/60">
                  <input
                    type="checkbox"
                    checked={selected.isSent}
                    disabled={!selected.generatedBody}
                    onChange={(e) => onToggleSent(selected.id, e.target.checked)}
                    className="rounded border-white/20 bg-black/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  Message envoyé
                </label>
                {!isPostSection && (
                  <button
                    type="button"
                    onClick={() => openRedditLink(selected.permalink)}
                    className="text-[12px] text-primary hover:text-primary/80"
                  >
                    Ouvrir sur Reddit
                  </button>
                )}
                <span className="text-[12px] text-white/40">
                  Pertinence {relevanceLabel(selected.relevanceScore)}
                </span>
                <span className="text-[12px] text-emerald-400/80">
                  Anti-ban {selected.safetyScore}/10
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
