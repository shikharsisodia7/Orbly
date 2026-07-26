import Dexie, { type EntityTable } from "dexie";
import type {
  QueueItemRecord,
  SettingsRecord,
  SnapshotFollowerRecord,
  SnapshotFollowingRecord,
  SnapshotRecord,
} from "./schema";

export class OrblyDatabase extends Dexie {
  snapshots!: EntityTable<SnapshotRecord, "id">;
  snapshotFollowers!: EntityTable<SnapshotFollowerRecord, "id">;
  snapshotFollowing!: EntityTable<SnapshotFollowingRecord, "id">;
  queueItems!: EntityTable<QueueItemRecord, "id">;
  settings!: EntityTable<SettingsRecord, "id">;

  constructor(name = "orbly-local") {
    super(name);
    this.version(1).stores({
      snapshots: "id, createdAt, datasetHash",
      snapshotFollowers: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      snapshotFollowing: "id, snapshotId, [snapshotId+normalizedUsername], normalizedUsername",
      queueItems: "id, normalizedUsername, status, source, addedAt",
      settings: "id",
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
