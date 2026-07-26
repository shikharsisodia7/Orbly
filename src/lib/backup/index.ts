import { getDb } from "@/lib/db";
import { SCHEMA_VERSION } from "@/lib/db/schema";
import { backupFileSchema, type BackupFile } from "./schema";

export async function buildBackup(): Promise<BackupFile> {
  const db = getDb();
  const [snapshots, snapshotFollowers, snapshotFollowing, queueItems, settings] =
    await Promise.all([
      db.snapshots.toArray(),
      db.snapshotFollowers.toArray(),
      db.snapshotFollowing.toArray(),
      db.queueItems.toArray(),
      db.settings.get("app"),
    ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    snapshots,
    snapshotFollowers,
    snapshotFollowing,
    queueItems,
    settings: settings ?? null,
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `orbly-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export class BackupValidationError extends Error {}

export function parseBackupFile(raw: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new BackupValidationError("This file isn't valid JSON.");
  }
  const result = backupFileSchema.safeParse(json);
  if (!result.success) {
    throw new BackupValidationError(
      "This doesn't look like a valid Orbly backup file."
    );
  }
  return result.data;
}

/** Replaces all local data with the contents of a validated backup. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
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

      await db.snapshots.bulkAdd(backup.snapshots);
      await db.snapshotFollowers.bulkAdd(backup.snapshotFollowers);
      await db.snapshotFollowing.bulkAdd(backup.snapshotFollowing);
      await db.queueItems.bulkAdd(backup.queueItems);
      if (backup.settings) {
        await db.settings.put(backup.settings);
      }
    }
  );
}
