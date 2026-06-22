"use client";

import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { useRedditMessageWorkspace } from "@/components/dashboard/use-reddit-message-workspace";

export default function WarmupPage() {
  const workspace = useRedditMessageWorkspace("warmup");

  return (
    <RedditMessageWorkspace
      title="Warmup"
      description="Posts ICP dans vos subreddits — commentaires naturels sans mentionner votre produit."
      {...workspace}
    />
  );
}
