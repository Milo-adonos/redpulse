"use client";

import { SectionWorkspace } from "@/components/dashboard/section-workspace";
import { useSectionWorkspace } from "@/components/dashboard/use-section-workspace";

export default function RepliesPage() {
  const workspace = useSectionWorkspace("reply");

  return (
    <SectionWorkspace
      title="Reply"
      sectionType="reply"
      {...workspace}
    />
  );
}
