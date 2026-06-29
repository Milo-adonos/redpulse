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

export function DemoReplyProfilePanel() {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[13px] font-semibold text-[#f97316]">Profile Information</h2>
      <div className="mt-6 space-y-6">
        <section>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
            Author
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f97316]/20 text-[14px] font-semibold text-[#f97316]">
              N
            </div>
            <div>
              <p className="text-[14px] text-white">u/nailartlover</p>
              <p className="text-[12px] text-[#888888]">0 followers</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: "Karma", value: "847" },
              { label: "Account", value: "2y" },
              { label: "Posts", value: "34" },
              { label: "Comments", value: "892" },
            ].map((cell) => (
              <div key={cell.label}>
                <p className="text-[11px] uppercase text-[#888888]">{cell.label}</p>
                <p className="mt-1 text-[18px] font-semibold text-white">{cell.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
            Subreddit
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f97316]/15 text-[12px] font-semibold text-[#f97316]">
              N
            </div>
            <div>
              <p className="text-[14px] text-white">r/Nails</p>
              <p className="text-[12px] text-[#888888]">4.1M members</p>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-[#888888]">Posts/day : 82</p>
        </section>

        <section>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#444444]">
            Opportunity score
          </p>
          <p className="mt-2 text-white">
            <span className="text-[36px] font-bold">89</span>
            <span className="text-[20px] text-[#888888]">/100</span>
          </p>
          <div className="mt-4 space-y-3">
            {(
              [
                ["Relevance", 94],
                ["Volume", 82],
                ["Niche fit", 91],
                ["Competition", 38],
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
    </div>
  );
}

export function DemoWarmupSidePanel() {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[13px] font-semibold text-[#f97316]">Karma builder</h2>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#888888]">
        Comments 100% niche-native. No product mention. Builds trust before any
        promotion.
      </p>
      <div className="mt-6 space-y-0">
        {[
          { label: "Comments today", value: "4", color: "#ffffff" },
          { label: "Karma gained", value: "+23", color: "#ffffff" },
          { label: "Ban risk", value: "0.02", color: "#22c55e" },
        ].map((row, index) => (
          <div key={row.label}>
            {index > 0 && <div className="my-4 border-t border-[#1a1a1a]" />}
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-[#888888]">{row.label}</span>
              <span className="font-semibold" style={{ color: row.color }}>
                {row.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoInfluenceSidePanel() {
  return (
    <div className="rounded-lg border border-[#1a1a1a] bg-[#111111] p-5">
      <h2 className="text-[16px] font-semibold text-[#f97316]">Strategy</h2>
      <p className="mt-3 text-[14px] leading-[1.6] text-[#888888]">
        Vague enough to spark DMs. Never names the product — they ask for the link
        themselves.
      </p>
      <div className="mt-6 rounded-lg border border-[#1a1a1a] bg-[#0c0c0c] p-4">
        <p className="text-[12px] text-[#666666]">Expected outcome</p>
        <p className="mt-2 text-[16px] font-semibold text-white">
          3-5 DMs asking for link / week
        </p>
      </div>
    </div>
  );
}
