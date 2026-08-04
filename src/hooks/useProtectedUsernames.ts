"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/**
 * Usernames the user has permanently protected (see protectedAccounts table).
 * Hidden from doesn't-follow-back and recent-unfollower views the same way
 * the chat tools hide them, so the dashboard can't be used as a loophole
 * around a protection set from the chat. Keyed on username alone, so it
 * survives every future re-import.
 */
export function useProtectedUsernames(): Set<string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().protectedAccounts.toArray();
    return new Set(all.map((item) => item.normalizedUsername));
  }, []);
  return result ?? new Set();
}
