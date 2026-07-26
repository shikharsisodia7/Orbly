"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { SettingsRecord } from "@/lib/db/schema";

const DEFAULT_SETTINGS: SettingsRecord = {
  id: "app",
  lastViewedSnapshot: null,
  onboardingCompleted: false,
  reducedMotionOverride: "system",
};

export function useSettings(): SettingsRecord | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const existing = await getDb().settings.get("app");
    return existing ?? DEFAULT_SETTINGS;
  }, []);
}
