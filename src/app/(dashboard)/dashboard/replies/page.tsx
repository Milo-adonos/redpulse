"use client";

import { RedditMessageWorkspace } from "@/components/dashboard/reddit-message-workspace";
import { useRedditMessageWorkspace } from "@/components/dashboard/use-reddit-message-workspace";

export default function RepliesPage() {
  const workspace = useRedditMessageWorkspace("reply");

  return (
    <RedditMessageWorkspace
      title="Reply"
      description="Posts ICP dans vos subreddits — réponses utiles, dont certaines mentionnent votre produit naturellement."
      {...workspace}
    />
  );
}
