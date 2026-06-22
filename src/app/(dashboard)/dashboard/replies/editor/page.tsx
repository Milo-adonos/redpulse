"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export default function EditorPage() {
  const searchParams = useSearchParams();
  const postId = searchParams.get("post") ?? undefined;
  const commentId = searchParams.get("comment") ?? undefined;

  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [error, setError] = useState("");
  const [sentUrl, setSentUrl] = useState<string | null>(null);

  const { data: context } = api.comments.getEditorContext.useQuery({
    discoveredPostId: postId,
  });

  const generate = api.comments.generateAndDraft.useMutation({
    onSuccess: (data) => {
      pushHistory(data.body);
      setBody(data.body);
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  const saveDraft = api.comments.createDraft.useMutation({
    onSuccess: () => setError(""),
    onError: (e) => setError(e.message),
  });

  const send = api.comments.approveAndSend.useMutation({
    onSuccess: (data) => {
      setSentUrl(data.permalink);
      setError("");
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (commentId && body === "") {
      // loaded via list navigation — body filled on generate or manual
    }
  }, [commentId, body]);

  function pushHistory(text: string) {
    setHistory((h) => [...h.slice(0, historyIdx + 1), text]);
    setHistoryIdx((i) => i + 1);
  }

  function handleGenerate() {
    if (!context?.post) {
      setError("Sélectionnez une conversation depuis Listen.");
      return;
    }
    generate.mutate({
      discoveredPostId: context.post.id,
      postTitle: context.post.title,
      postBody: context.post.body ?? undefined,
      subreddit: context.post.subreddit,
      mentionProduct: true,
      tone: "helpful",
    });
  }

  function handleSave() {
    if (!body.trim()) return;
    saveDraft.mutate({
      discoveredPostId: context?.post?.id,
      body,
    });
  }

  function handleSend() {
    if (!commentId && !generate.data?.id) {
      saveDraft.mutate(
        {
          discoveredPostId: context?.post?.id,
          body,
        },
        {
          onSuccess: (row) => {
            send.mutate({ id: row.id });
          },
        },
      );
      return;
    }
    const id = commentId ?? generate.data?.id;
    if (id) send.mutate({ id });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black md:relative md:inset-auto md:min-h-[calc(100vh-8rem)] md:rounded-2xl md:border md:border-white/[0.06]">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/replies"
            className="text-[13px] text-white/40 hover:text-white/70"
          >
            ← Retour
          </Link>
          <span className="text-[13px] text-white/60">
            {context?.post?.title ?? "Éditeur IA"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => historyIdx > 0 && (setHistoryIdx(historyIdx - 1), setBody(history[historyIdx - 1] ?? ""))}
            disabled={historyIdx <= 0}
            className="rounded-lg px-3 py-1.5 text-[12px] text-white/40 hover:text-white disabled:opacity-30"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[12px] transition-colors",
              preview ? "bg-white/10 text-white" : "text-white/40 hover:text-white",
            )}
          >
            {preview ? "Éditer" : "Aperçu"}
          </button>
        </div>
      </header>

      {sentUrl && (
        <div className="border-b border-emerald-500/20 bg-emerald-500/10 px-5 py-3 text-[13px] text-emerald-300">
          Publié sur Reddit ·{" "}
          <a href={sentUrl} target="_blank" rel="noreferrer" className="underline">
            Voir le commentaire
          </a>
        </div>
      )}

      {error && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-5 py-3 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="hidden w-56 shrink-0 border-r border-white/[0.06] p-4 lg:block">
          <p className="text-[10px] uppercase tracking-wider text-white/30">Contexte</p>
          <p className="mt-2 text-[11px] leading-relaxed text-white/45">
            {context?.productName} — {context?.productContext.slice(0, 120)}…
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isLoading || !context?.post}
            className="mt-4 w-full rounded-full bg-primary/90 py-2.5 text-[12px] font-medium text-white hover:bg-primary disabled:opacity-50"
          >
            {generate.isLoading ? "Génération…" : "✦ Générer avec Claude"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveDraft.isLoading || !body}
            className="mt-2 w-full rounded-full border border-white/10 py-2.5 text-[12px] text-white/60 hover:text-white"
          >
            Sauvegarder brouillon
          </button>
        </aside>

        <div className="flex flex-1 flex-col p-5 md:p-8">
          {preview ? (
            <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                {body || "Rien à prévisualiser."}
              </p>
            </div>
          ) : (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rédigez ou générez votre réponse…"
              className="min-h-[300px] flex-1 resize-none rounded-xl border border-white/[0.06] bg-transparent p-6 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-primary/30 lg:min-h-0"
            />
          )}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] text-white/30">{body.length} caractères</p>
            <button
              type="button"
              onClick={handleSend}
              disabled={send.isLoading || !body || !!sentUrl}
              className="rounded-full bg-white px-6 py-2.5 text-[13px] font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              {send.isLoading ? "Publication…" : "Valider l'envoi"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
