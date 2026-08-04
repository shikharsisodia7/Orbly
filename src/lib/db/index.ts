import Dexie, { type EntityTable } from "dexie";
import type {
  ProtectedAccountRecord,
  QueueItemRecord,
  SettingsRecord,
  SnapshotFollowerRecord,
  SnapshotFollowingRecord,
  SnapshotRecord,
} from "./schema";
import { normalizeSnapshotRecord } from "./migrate";

export class OrblyDatabase extends Dexie {
  snapshots!: EntityTable<SnapshotRecord, "id">;
  snapshotFollowers!: EntityTable<SnapshotFollowerRecord, "id">;
  snapshotFollowing!: EntityTable<SnapshotFollowingRecord, "id">;
  queueItems!: EntityTable<QueueItemRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  protectedAccounts!: EntityTable<ProtectedAccountRecord, "id">;

  constructor(name = "orbly-local") {
    super(name);
    this.version(1).stores({
      snapshots: "id, createdAt, datasetHash",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
    });

    // Adds validity tracking (parserVersion, dateRangeSource, validity,
    // validityReasons, profileReferenceCounts) to every existing snapshot.
    // Snapshots imported before this fix are re-assessed rather than trusted
    // by default — a date-limited or otherwise incomplete snapshot must not
    // become "complete" simply by virtue of already existing.
    this.version(2)
      .stores({
        snapshots: "id, createdAt, datasetHash, validity",
        snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
        queueItems: "id, normalizedUsername, status, source, addedAt",
        settings: "id",
      })
      .upgrade(async (tx) => {
        const snapshots = await tx.table<SnapshotRecord>("snapshots").toArray();
        await Promise.all(
          snapshots.map((snapshot) =>
            tx.table("snapshots").update(snapshot.id, normalizeSnapshotRecord(snapshot))
          )
        );
      });

    // Adds the protected-accounts table (manual tagging: verified, brand,
    // close friend, or any custom label) — permanently excluded from
    // unfollow suggestions across every future re-import, the same way
    // queueItems already survive re-imports. &normalizedUsername enforces
    // one protection record per account and gives O(1) membership checks.
    this.version(3).stores({
      snapshots: "id, createdAt, datasetHash, validity",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
      protectedAccounts: "id, &normalizedUsername, dateAdded",
    });
  }
}

let dbInstance: OrblyDatabase | null = null;

/** Lazily creates a single shared Dexie instance (browser-only). */
export function getDb(): OrblyDatabase {
  if (typeof window === "undefined") {
    throw new Error("OrblyDatabase can only be used in the browser");
  }
  if (!dbInstance) {
    dbInstance = new OrblyDatabase();
  }
  return dbInstance;
}

export * from "./schema";
