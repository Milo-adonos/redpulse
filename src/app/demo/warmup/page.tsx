"use client";

import { useState } from "react";
import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import type { SectionTab } from "@/components/dashboard/use-section-workspace";
import { DEMO_WARMUP_ITEMS } from "@/lib/demo/mock-data";
import { DemoWarmupSidePanel } from "@/lib/demo/static-panels";

const noop = () => {};

export default function DemoWarmupPage() {
  const [tab, setTab] = useState<SectionTab>("a_traiter");

  return (
    <div id="screenshot-target" className="mx-auto w-[1280px] px-8 py-6">
      <SectionWorkspace
        title="Warmup"
        sectionType="warmup"
        tab={tab}
        setTab={setTab}
        queueCount={DEMO_WARMUP_ITEMS.length}
        items={DEMO_WARMUP_ITEMS}
        isLoading={false}
        isSyncing={false}
        onSync={noop}
        onToggleSent={noop}
        onRegenerate={noop}
        onSelectPost={noop}
        demoMode={{
          postingUsername: "nailuser",
          postingKarma: 127,
          sidePanel: <DemoWarmupSidePanel />,
          initialSelectedRedditId: "demo-warmup-1",
        }}
      />
    </div>
  );
}
