import type { Relationship } from "@/lib/instagram/types";
import type { SnapshotFollowerRecord, SnapshotFollowingRecord } from "./schema";

export function recordToRelationship(
  record: SnapshotFollowerRecord | SnapshotFollowingRecord
): Relationship {
  return {
    normalizedUsername: record.normalizedUsername,
    displayUsername: record.displayUsername,
    profileUrl: record.profileUrl,
    timestamp: record.instagramTimestamp,
  };
}
