"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { SnapshotRecord } from "@/lib/db/schema";

/** All snapshots, newest first. Undefined while loading, empty array once resolved with none. */
export function useSnapshots(): SnapshotRecord[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const all = await getDb().snapshots.toArray();
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, []);
}

export function useLatestSnapshot(): SnapshotRecord | undefined {
  const snapshots = useSnapshots();
  return snapshots?.[0];
}

export function useSnapshotById(id: string | undefined): SnapshotRecord | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined" || !id) return undefined;
    return getDb().snapshots.get(id);
  }, [id]);
}

export function usePreviousSnapshot(currentId: string | undefined): SnapshotRecord | undefined {
  const snapshots = useSnapshots();
  if (!snapshots || !currentId) return undefined;
  const index = snapshots.findIndex((s) => s.id === currentId);
  if (index === -1 || index === snapshots.length - 1) return undefined;
  return snapshots[index + 1];
}
