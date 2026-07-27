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

    const isUsable = (s: SnapshotRecord) => s.validity !== "partial" && s.validity !== "invalid";
    // "Still following them" is a secondary signal read from the most recent
    // USABLE snapshot — a partial/invalid latest snapshot can't be trusted to
    // say who is or isn't currently followed.
    const newestUsable = [...snapshots].reverse().find(isUsable);
    const latestFollowingSet = newestUsable
      ? new Set(
          (await db.snapshotFollowing.where("snapshotId").equals(newestUsable.id).toArray()).map(
            (r) => r.normalizedUsername
          )
        )
      : new Set<string>();

    const events: LostFollowerEvent[] = [];
    for (let i = 0; i < snapshots.length - 1; i++) {
      const from = snapshots[i];
      const to = snapshots[i + 1];
      // A partial/invalid snapshot on either side of the pair means we can't
      // tell whether an apparent "lost follower" is real or just an artifact
      // of an incomplete export — so that pair is skipped entirely rather
      // than reporting a misleading change.
      if (!isUsable(from) || !isUsable(to)) continue;
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
