"use client";

import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { useRedditMessageWorkspace } from "@/components/dashboard/use-reddit-message-workspace";

export default function RepliesPage() {
  const workspace = useRedditMessageWorkspace("reply");

  return (
    <RedditMessageWorkspace
      title="Reply"
      description="Posts ICP + gens qui cherchent un outil/site — réponses avec mention naturelle du produit."
      {...workspace}
    />
  );
}
