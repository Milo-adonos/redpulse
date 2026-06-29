"use client";

import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import { useSectionWorkspace } from "@/components/dashboard/use-section-workspace";

export default function InfluencePage() {
  const workspace = useSectionWorkspace("influence");

  return (
    <SectionWorkspace
      title="Influence"
      sectionType="influence"
      {...workspace}
    />
  );
}
