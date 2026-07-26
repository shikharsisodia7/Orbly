"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/** Set of normalized usernames currently in the queue (any status), for quick membership checks. */
export function useQueueUsernames(): Set<string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().queueItems.toArray();
    return new Set(all.map((item) => item.normalizedUsername));
  }, []);
  return result ?? new Set();
}
