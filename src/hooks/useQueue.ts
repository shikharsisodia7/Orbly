"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { QueueItemRecord, QueueStatus } from "@/lib/db/schema";

export function useQueueItems(status?: QueueStatus): QueueItemRecord[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const db = getDb();
    const items = status
      ? await db.queueItems.where("status").equals(status).toArray()
      : await db.queueItems.toArray();
    return items.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  }, [status]);
}

export function usePendingQueueCount(): number {
  const items = useQueueItems("pending");
  return items?.length ?? 0;
}
