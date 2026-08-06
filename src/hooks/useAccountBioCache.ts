"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/**
 * Every bio captured so far, keyed by normalized username — populated one
 * account at a time via the browser extension's explicit lookup, never
 * bulk-fetched. Used to evaluate bio exclusion rules on the dashboard the
 * same way the chat tools already do.
 */
export function useCachedBios(): Map<string, string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().accountBioCache.toArray();
    return new Map(all.map((r) => [r.normalizedUsername, r.bio]));
  }, []);
  return result ?? new Map();
}
