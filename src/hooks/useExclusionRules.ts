"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { ExclusionRuleRecord } from "@/lib/db/schema";

/**
 * Persistent, pattern-based exclusion rules (see exclusionRules table).
 * Hidden from doesn't-follow-back and recent-unfollower views the same way
 * the chat tools apply them, so the dashboard can't be used as a loophole
 * around a rule set from the chat — and, unlike protected accounts, there's
 * no "show anyway" override for these anywhere in the app.
 */
export function useExclusionRules(): ExclusionRuleRecord[] {
  const result = useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    return getDb().exclusionRules.toArray();
  }, []);
  return result ?? [];
}
