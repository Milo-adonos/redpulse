"use client";

import { useState } from "react";
import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import type { SectionTab } from "@/components/dashboard/use-section-workspace";
import {
  DEMO_INFLUENCE_ITEMS,
  DEMO_REPLY_ITEMS,
  DEMO_WARMUP_ITEMS,
} from "@/lib/demo/mock-data";
import {
  DemoInfluenceSidePanel,
  DemoReplyProfilePanel,
  DemoWarmupSidePanel,
} from "@/lib/demo/static-panels";

const noop = () => {};

function DemoSectionPage({
  title,
  sectionType,
  items,
  sidePanel,
  initialSelectedRedditId,
}: {
  title: string;
  sectionType: "reply" | "warmup" | "influence";
  items: typeof DEMO_REPLY_ITEMS;
  sidePanel: React.ReactNode;
  initialSelectedRedditId: string;
}) {
  const [tab, setTab] = useState<SectionTab>("a_traiter");

  return (
    <div id="screenshot-target" className="mx-auto w-[1280px] px-8 py-6">
      <SectionWorkspace
        title={title}
        sectionType={sectionType}
        tab={tab}
        setTab={setTab}
        queueCount={items.length}
        items={items}
        isLoading={false}
        isSyncing={false}
        onSync={noop}
        onToggleSent={noop}
        onRegenerate={noop}
        onSelectPost={noop}
        demoMode={{
          postingUsername: "nailuser",
          postingKarma: 127,
          sidePanel,
          initialSelectedRedditId,
        }}
      />
    </div>
  );
}

export default function DemoReplyPage() {
  return (
    <DemoSectionPage
      title="Reply"
      sectionType="reply"
      items={DEMO_REPLY_ITEMS}
      sidePanel={<DemoReplyProfilePanel />}
      initialSelectedRedditId="demo-reply-1"
    />
  );
}
