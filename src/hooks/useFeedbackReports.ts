"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { FeedbackReportRecord } from "@/lib/db/schema";

/** Every feedback report submitted from this browser, newest first. */
export function useFeedbackReports(): FeedbackReportRecord[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().feedbackReports.toArray();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);
}
