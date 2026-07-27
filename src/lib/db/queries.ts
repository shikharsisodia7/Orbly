import { getDb } from "./index";
import type {
  QueueItemRecord,
  QueueSource,
  QueueStatus,
  SettingsRecord,
  SnapshotFollowerRecord,
  SnapshotFollowingRecord,
  SnapshotRecord,
} from "./schema";
import type { ExportCoverage, Relationship } from "@/lib/instagram/types";

function newId(): string {
  return crypto.randomUUID();
}

export interface CreateSnapshotInput {
  followers: Relationship[];
  following: Relationship[];
  datasetHash: string;
  originalFileName: string | null;
  label?: string;
  coverage?: ExportCoverage | null;
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<SnapshotRecord> {
  const db = getDb();
  const now = new Date().toISOString();
  const snapshot: SnapshotRecord = {
    id: newId(),
    createdAt: now,
    importedAt: now,
    label: input.label,
    followersCount: input.followers.length,
    followingCount: input.following.length,
    datasetHash: input.datasetHash,
    originalFileName: input.originalFileName,
    coverageFromIso: input.coverage?.fromIso ?? null,
    coverageToIso: input.coverage?.toIso ?? null,
    coverageLooksLimited: input.coverage?.looksLimited ?? false,
  };

  const followerRecords: SnapshotFollowerRecord[] = input.followers.map((rel) => ({
    id: newId(),
    snapshotId: snapshot.id,
    normalizedUsername: rel.normalizedUsername,
    displayUsername: rel.displayUsername,
    profileUrl: rel.profileUrl,
    instagramTimestamp: rel.timestamp,
  }));

  const followingRecords: SnapshotFollowingRecord[] = input.following.map((rel) => ({
    id: newId(),
    snapshotId: snapshot.id,
    normalizedUsername: rel.normalizedUsername,
    displayUsername: rel.displayUsername,
    profileUrl: rel.profileUrl,
    instagramTimestamp: rel.timestamp,
  }));

  await db.transaction(
    "rw",
    db.snapshots,
    db.snapshotFollowers,
    db.snapshotFollowing,
    async () => {
      await db.snapshots.add(snapshot);
      await db.snapshotFollowers.bulkAdd(followerRecords);
      await db.snapshotFollowing.bulkAdd(followingRecords);
    }
  );

  return snapshot;
}

export async function findSnapshotByDatasetHash(
  hash: string
): Promise<SnapshotRecord | undefined> {
  return getDb().snapshots.where("datasetHash").equals(hash).first();
}

export async function getAllSnapshots(): Promise<SnapshotRecord[]> {
  const snapshots = await getDb().snapshots.toArray();
  return snapshots.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSnapshotCount(): Promise<number> {
  return getDb().snapshots.count();
}

export async function getSnapshotById(id: string): Promise<SnapshotRecord | undefined> {
  return getDb().snapshots.get(id);
}

export async function getLatestSnapshot(): Promise<SnapshotRecord | undefined> {
  const all = await getAllSnapshots();
  return all[0];
}

/** Returns the snapshot immediately before the given one, chronologically. */
export async function getPreviousSnapshot(
  snapshotId: string
): Promise<SnapshotRecord | undefined> {
  const all = await getAllSnapshots(); // desc order
  const index = all.findIndex((s) => s.id === snapshotId);
  if (index === -1 || index === all.length - 1) return undefined;
  return all[index + 1];
}

export async function getSnapshotFollowers(
  snapshotId: string
): Promise<SnapshotFollowerRecord[]> {
  return getDb().snapshotFollowers.where("snapshotId").equals(snapshotId).toArray();
}

export async function getSnapshotFollowing(
  snapshotId: string
): Promise<SnapshotFollowingRecord[]> {
  return getDb().snapshotFollowing.where("snapshotId").equals(snapshotId).toArray();
}

export async function renameSnapshot(id: string, label: string): Promise<void> {
  await getDb().snapshots.update(id, { label });
}

export async function deleteSnapshot(id: string): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    db.snapshots,
    db.snapshotFollowers,
    db.snapshotFollowing,
    async () => {
      await db.snapshots.delete(id);
      await db.snapshotFollowers.where("snapshotId").equals(id).delete();
      await db.snapshotFollowing.where("snapshotId").equals(id).delete();
    }
  );
}

export async function deleteAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(
    "rw",
    db.snapshots,
    db.snapshotFollowers,
    db.snapshotFollowing,
    db.queueItems,
    db.settings,
    async () => {
      await db.snapshots.clear();
      await db.snapshotFollowers.clear();
      await db.snapshotFollowing.clear();
      await db.queueItems.clear();
      await db.settings.clear();
    }
  );
}

// --- Queue ---

export async function getQueueItems(status?: QueueStatus): Promise<QueueItemRecord[]> {
  const db = getDb();
  const items = status
    ? await db.queueItems.where("status").equals(status).toArray()
    : await db.queueItems.toArray();
  return items.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export async function getQueueUsernames(): Promise<Set<string>> {
  const all = await getDb().queueItems.toArray();
  return new Set(all.map((item) => item.normalizedUsername));
}

export interface AddToQueueInput {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  source: QueueSource;
}

export async function addManyToQueue(items: AddToQueueInput[]): Promise<number> {
  const db = getDb();
  const existing = await getQueueUsernames();
  const now = new Date().toISOString();
  const toInsert: QueueItemRecord[] = items
    .filter((item) => !existing.has(item.normalizedUsername))
    .map((item) => ({
      id: newId(),
      normalizedUsername: item.normalizedUsername,
      displayUsername: item.displayUsername,
      profileUrl: item.profileUrl,
      addedAt: now,
      source: item.source,
      status: "pending",
    }));
  if (toInsert.length > 0) {
    await db.queueItems.bulkAdd(toInsert);
  }
  return toInsert.length;
}

export async function updateQueueItemStatus(id: string, status: QueueStatus): Promise<void> {
  await getDb().queueItems.update(id, { status });
}

/**
 * Reconciles the queue against a freshly imported following list.
 *
 * A pending queue item whose username is absent from the new export is no
 * longer someone you follow — either you unfollowed them, or their account was
 * deleted/deactivated and Instagram dropped it from your list. Either way the
 * item is resolved, so we close it out instead of leaving a dead row behind.
 *
 * Returns the number of items resolved.
 */
export async function reconcileQueueWithFollowing(
  currentFollowing: Relationship[]
): Promise<number> {
  const db = getDb();
  const stillFollowing = new Set(currentFollowing.map((r) => r.normalizedUsername));
  const pending = await db.queueItems.where("status").equals("pending").toArray();
  const resolved = pending.filter((item) => !stillFollowing.has(item.normalizedUsername));

  if (resolved.length > 0) {
    await db.queueItems.bulkPut(
      resolved.map((item) => ({ ...item, status: "completed" as const }))
    );
  }
  return resolved.length;
}

export async function removeQueueItem(id: string): Promise<void> {
  await getDb().queueItems.delete(id);
}

export async function clearQueue(): Promise<void> {
  await getDb().queueItems.clear();
}

export async function clearCompletedAndSkipped(): Promise<void> {
  const db = getDb();
  const items = await db.queueItems
    .where("status")
    .anyOf(["completed", "skipped"])
    .toArray();
  await db.queueItems.bulkDelete(items.map((i) => i.id));
}

// --- Settings ---

const DEFAULT_SETTINGS: SettingsRecord = {
  id: "app",
  lastViewedSnapshot: null,
  onboardingCompleted: false,
  reducedMotionOverride: "system",
};

export async function getSettings(): Promise<SettingsRecord> {
  const existing = await getDb().settings.get("app");
  return existing ?? DEFAULT_SETTINGS;
}

export async function updateSettings(patch: Partial<SettingsRecord>): Promise<SettingsRecord> {
  const db = getDb();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.settings.put(next);
  return next;
}
