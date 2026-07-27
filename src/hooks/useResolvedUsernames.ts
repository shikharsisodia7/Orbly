"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/**
 * Usernames the user has already acted on via the queue (marked Done).
 *
 * These are hidden from the active "doesn't follow you back" view: the user has
 * unfollowed them, but the current snapshot was taken before that happened, so
 * the raw export still lists them. They reappear correctly — or drop out for
 * good — on the next import.
 */
export function useResolvedUsernames(): Set<string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const completed = await getDb().queueItems.where("status").equals("completed").toArray();
    return new Set(completed.map((item) => item.normalizedUsername));
  }, []);
  return result ?? new Set();
}
