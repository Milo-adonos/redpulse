"use client";

import { useEffect, useRef } from "react";
import { api } from "@/trpc/react";

export function DashboardSyncBootstrap() {
  const ran = useRef(false);
  const syncAll = api.messages.syncAll.useMutation();

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    syncAll.mutate();
  }, []);

  return null;
}
