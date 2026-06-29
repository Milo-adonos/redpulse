"use client";

import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import { useSectionWorkspace } from "@/components/dashboard/use-section-workspace";

export default function WarmupPage() {
  const workspace = useSectionWorkspace("warmup");

  return (
    <SectionWorkspace
      title="Warmup"
      sectionType="warmup"
      {...workspace}
    />
  );
}
