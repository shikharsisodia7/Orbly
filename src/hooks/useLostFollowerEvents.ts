"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import type { SnapshotRecord } from "@/lib/db/schema";

export interface LostFollowerEvent {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  fromSnapshot: SnapshotRecord;
  toSnapshot: SnapshotRecord;
  stillFollowingThem: boolean;
}

/**
 * Walks every consecutive pair of snapshots (oldest to newest) and records
 * anyone present in followers at snapshot N but absent at snapshot N+1.
 * Never inferred from anything other than that exact before/after comparison.
 */
export function useLostFollowerEvents(): LostFollowerEvent[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined") return undefined;
    const db = getDb();
    const snapshots = (await db.snapshots.toArray()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    if (snapshots.length < 2) return [];

    const latest = snapshots[snapshots.length - 1];
    const latestFollowing = await db.snapshotFollowing.where("snapshotId").equals(latest.id).toArray();
    const latestFollowingSet = new Set(latestFollowing.map((r) => r.normalizedUsername));

    const events: LostFollowerEvent[] = [];
    for (let i = 0; i < snapshots.length - 1; i++) {
      const from = snapshots[i];
      const to = snapshots[i + 1];
      const [fromFollowers, toFollowers] = await Promise.all([
        db.snapshotFollowers.where("snapshotId").equals(from.id).toArray(),
        db.snapshotFollowers.where("snapshotId").equals(to.id).toArray(),
      ]);
      const toSet = new Set(toFollowers.map((r) => r.normalizedUsername));
      for (const rec of fromFollowers) {
        if (!toSet.has(rec.normalizedUsername)) {
          events.push({
            normalizedUsername: rec.normalizedUsername,
            displayUsername: rec.displayUsername,
            profileUrl: rec.profileUrl,
            fromSnapshot: from,
            toSnapshot: to,
            stillFollowingThem: latestFollowingSet.has(rec.normalizedUsername),
          });
        }
      }
    }

    return events.sort((a, b) => b.toSnapshot.createdAt.localeCompare(a.toSnapshot.createdAt));
  }, []);
}
