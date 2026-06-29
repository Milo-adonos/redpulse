"use client";

import { api } from "@/trpc/react";

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatAccountAge(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const years = Math.floor(days / 365);
  return `${years}y`;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-sm bg-[#1a1a1a]">
      <div
        className="h-full rounded-sm bg-[#f97316] transition-all duration-150"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function computeOpportunity(input: {
  relevanceScore: number | null;
  redditScore: number | null;
  styleConfidence: number | null;
  postsPerDay: number | null;
}) {
  const relevance = Math.round(input.relevanceScore ?? 0);
  const volume = Math.min(
    100,
    Math.round((input.redditScore ?? 0) * 1.5 + (input.postsPerDay ?? 0) * 0.8),
  );
  const nicheFit = Math.min(100, Math.round((input.styleConfidence ?? 5) * 10));
  const competition = Math.max(0, Math.min(100, Math.round(110 - relevance * 0.85)));
  const overall = Math.round(
    (relevance + volume + nicheFit + (100 - competition)) / 4,
  );

  return {
    overall,
    relevance,
    volume,
    nicheFit,
    competition,
  };
}

interface ProfileInformationPanelProps {
  username?: string | null;
  subreddit?: string | null;
  relevanceScore?: number | null;
  redditScore?: number | null;
  styleConfidence?: number | null;
}

export function ProfileInformationPanel({
  username,
  subreddit,
  relevanceScore,
  redditScore,
  styleConfidence,
}: ProfileInformationPanelProps) {
  const hasSelection = Boolean(username && username !== "unknown");

  const { data, isLoading } = api.messages.getAuthorProfile.useQuery(
    { username: username ?? "", subreddit: subreddit ?? undefined },
    { enabled: hasSelection },
  );

  const opportunity = computeOpportunity({
    relevanceScore: relevanceScore ?? null,
    redditScore: redditScore ?? null,
    styleConfidence: styleConfidence ?? null,
    postsPerDay: data?.subreddit?.postsPerDay ?? null,
  });

  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[13px] font-semibold text-[#f97316]">Profile Information</h2>

      {!hasSelection ? (
        <p className="mt-16 text-center text-[13px] text-[#888888]">
          Sélectionnez un post
        </p>
      ) : isLoading ? (
        <p className="mt-8 text-[13px] text-[#888888]">Chargement…</p>
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
              Author
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]/20 text-[14px] font-semibold text-[#f97316]">
                {username!.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[14px] text-white">u/{username}</p>
                <p className="text-[12px] text-[#888888]">0 followers</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Karma", value: formatNumber(data?.karma) },
                { label: "Account", value: formatAccountAge(data?.accountAgeDays) },
                { label: "Posts", value: formatNumber(data?.postCount) },
                { label: "Comments", value: formatNumber(data?.commentCount) },
              ].map((cell) => (
                <div key={cell.label}>
                  <p className="text-[11px] uppercase text-[#888888]">{cell.label}</p>
                  <p className="mt-1 text-[18px] font-semibold text-white">{cell.value}</p>
                </div>
              ))}
            </div>
          </section>

          {data?.subreddit && (
            <section>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
                Subreddit
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316]/15 text-[12px] font-semibold text-[#f97316]">
                  {data.subreddit.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[14px] text-white">r/{data.subreddit.name}</p>
                  <p className="text-[12px] text-[#888888]">
                    {formatNumber(data.subreddit.members)} members
                  </p>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-[#888888]">
                Posts/day : {formatNumber(data.subreddit.postsPerDay)}
              </p>
            </section>
          )}

          <section>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
              Opportunity score
            </p>
            <p className="mt-2 text-white">
              <span className="text-[36px] font-bold">{opportunity.overall}</span>
              <span className="text-[20px] text-[#888888]">/100</span>
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["Relevance", opportunity.relevance],
                  ["Volume", opportunity.volume],
                  ["Niche fit", opportunity.nicheFit],
                  ["Competition", opportunity.competition],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="text-[#888888]">{label}</span>
                    <span className="text-white">{value}</span>
                  </div>
                  <ProgressBar value={value} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
