"use client";

import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getDb } from "@/lib/db";
import { recordToRelationship } from "@/lib/db/mappers";
import { computeCurrentRelationships, computeSnapshotChanges } from "@/lib/instagram/comparisons";
import type { Relationship } from "@/lib/instagram/types";

export function useSnapshotFollowers(snapshotId: string | undefined): Relationship[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined" || !snapshotId) return undefined;
    const rows = await getDb().snapshotFollowers.where("snapshotId").equals(snapshotId).toArray();
    return rows.map(recordToRelationship);
  }, [snapshotId]);
}

export function useSnapshotFollowing(snapshotId: string | undefined): Relationship[] | undefined {
  return useLiveQuery(async () => {
    if (typeof window === "undefined" || !snapshotId) return undefined;
    const rows = await getDb().snapshotFollowing.where("snapshotId").equals(snapshotId).toArray();
    return rows.map(recordToRelationship);
  }, [snapshotId]);
}

/** Mutuals / doesn't-follow-back / you-don't-follow-back for a single snapshot. */
export function useCurrentRelationships(snapshotId: string | undefined) {
  const followers = useSnapshotFollowers(snapshotId);
  const following = useSnapshotFollowing(snapshotId);

  return useMemo(() => {
    if (!followers || !following) return undefined;
    return computeCurrentRelationships(followers, following);
  }, [followers, following]);
}

/** New/lost followers and started/stopped following between two snapshots. */
export function useSnapshotComparison(
  previousSnapshotId: string | undefined,
  currentSnapshotId: string | undefined
) {
  const prevFollowers = useSnapshotFollowers(previousSnapshotId);
  const currFollowers = useSnapshotFollowers(currentSnapshotId);
  const prevFollowing = useSnapshotFollowing(previousSnapshotId);
  const currFollowing = useSnapshotFollowing(currentSnapshotId);

  return useMemo(() => {
    if (!prevFollowers || !currFollowers || !prevFollowing || !currFollowing) return undefined;
    return computeSnapshotChanges(prevFollowers, currFollowers, prevFollowing, currFollowing);
  }, [prevFollowers, currFollowers, prevFollowing, currFollowing]);
}
