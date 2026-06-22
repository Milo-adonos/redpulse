"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/data-list";
import { api } from "@/trpc/react";
import { ux } from "@/lib/ux-copy";

export default function TeamPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: members = [], refetch, isLoading } = api.team.listMembers.useQuery();
  const { data: pending = [], refetch: refetchPending } =
    api.team.listPendingInvites.useQuery();
  const invite = api.team.inviteMember.useMutation({
    onSuccess: (data) => {
      setFeedback(
        data.status === "active"
          ? `${data.email} a accès immédiatement.`
          : `${data.email} est en attente — accès à la création de compte.`,
      );
      setInviteEmail("");
      refetch();
      refetchPending();
    },
    onError: (e) => setError(e.message),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFeedback("");
    if (!inviteEmail.includes("@")) return;
    invite.mutate({ email: inviteEmail, role: "viewer" });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Team"
        description="Membres, rôles et invitations par email."
      />

      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="text-[12px] text-white/50">Inviter par email</label>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="collegue@entreprise.com"
            className="mt-2 w-full rounded-xl border border-white/[0.06] bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-primary/30"
          />
          <p className="mt-1.5 text-[11px] text-white/30">{ux.hints.invite}</p>
          {error && <p className="mt-2 text-[12px] text-red-400">{error}</p>}
          {feedback && <p className="mt-2 text-[12px] text-emerald-400/80">{feedback}</p>}
        </div>
        <button
          type="submit"
          disabled={invite.isLoading}
          className="rounded-full bg-white px-6 py-3 text-[13px] font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          Inviter
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        {isLoading ? (
          <p className="p-8 text-center text-white/40">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="p-8 text-center text-white/40">{ux.empty.team.body}</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/[0.06] px-5 py-3 text-[11px] uppercase tracking-wider text-white/30">
              <span>Membre</span>
              <span>Rôle</span>
              <span>Messages envoyés</span>
            </div>
            {members.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/[0.04] px-5 py-4 last:border-0"
              >
                <div>
                  <p className="text-[13px] font-medium text-white/80">{m.name ?? m.email}</p>
                  <p className="text-[11px] text-white/35">{m.email}</p>
                </div>
                <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] capitalize text-white/50">
                  {m.role}
                </span>
                <span className="text-[13px] text-white/70">{m.messagesSent}</span>
              </div>
            ))}
          </>
        )}
      </div>

      {pending.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-medium text-white/80">Invitations en attente</h2>
          <div className="mt-3 space-y-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] px-4 py-3 text-[13px]"
              >
                <span className="text-white/70">{p.email}</span>
                <span className="text-[11px] capitalize text-white/35">{p.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
