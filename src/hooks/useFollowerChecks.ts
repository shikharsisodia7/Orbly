"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { FollowerCheckRecord } from "@/lib/db/schema";

/** Every "Check Now" check-in, newest first — the short history the user can see beyond just the latest diff. */
export function useFollowerChecks(): FollowerCheckRecord[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().followerChecks.toArray();
    return all.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  }, []);
}
