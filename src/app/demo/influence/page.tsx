"use client";

import { useState } from "react";
import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import type { SectionTab } from "@/components/dashboard/use-section-workspace";
import { DEMO_INFLUENCE_ITEMS } from "@/lib/demo/mock-data";
import { DemoInfluenceSidePanel } from "@/lib/demo/static-panels";

const noop = () => {};

export default function DemoInfluencePage() {
  const [tab, setTab] = useState<SectionTab>("a_traiter");

  return (
    <div id="screenshot-target" className="mx-auto w-[1280px] px-8 py-6">
      <SectionWorkspace
        title="Influence"
        sectionType="influence"
        tab={tab}
        setTab={setTab}
        queueCount={DEMO_INFLUENCE_ITEMS.length}
        items={DEMO_INFLUENCE_ITEMS}
        isLoading={false}
        isSyncing={false}
        onSync={noop}
        onToggleSent={noop}
        onRegenerate={noop}
        onSelectPost={noop}
        demoMode={{
          postingUsername: "nailuser",
          postingKarma: 127,
          sidePanel: <DemoInfluenceSidePanel />,
          initialSelectedRedditId: "demo-influence-1",
        }}
      />
    </div>
  );
}
