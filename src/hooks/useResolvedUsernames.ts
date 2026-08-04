"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/**
 * Usernames the user has already acted on via the queue — marked Done
 * (completed) or Skip (skipped). Both are terminal decisions the user made
 * about that account, so both stay hidden from the active "doesn't follow
 * you back" view, keyed on username alone rather than the snapshot that
 * produced the suggestion — this holds across every future re-import, not
 * just until the next one.
 */
export function useResolvedUsernames(): Set<string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const resolved = await getDb().queueItems.where("status").anyOf(["completed", "skipped"]).toArray();
    return new Set(resolved.map((item) => item.normalizedUsername));
  }, []);
  return result ?? new Set();
}
