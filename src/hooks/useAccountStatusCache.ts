"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";

/**
 * Usernames confirmed gone (banned/deactivated/deleted) the last time they
 * were looked up via the browser extension — never bulk-checked. Excluded
 * from doesn't-follow-back and recent-unfollowers the same way the chat
 * tools already do, so the dashboard can't be used as a loophole.
 */
export function useNotFoundUsernames(): Set<string> {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().accountStatusCache.where("status").equals("not_found").toArray();
    return new Set(all.map((r) => r.normalizedUsername));
  }, []);
  return result ?? new Set();
}
