export interface SnapshotRecord {
  id: string;
  createdAt: string; // ISO timestamp — when this snapshot was created in Orbly
  importedAt: string; // ISO timestamp — when the export file was processed
  label?: string;
  followersCount: number;
  followingCount: number;
  datasetHash: string;
  originalFileName: string | null;
}

export interface SnapshotFollowerRecord {
  id: string;
  snapshotId: string;
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  instagramTimestamp: number | null;
}

export interface SnapshotFollowingRecord {
  id: string;
  snapshotId: string;
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  instagramTimestamp: number | null;
}

export type QueueSource = "does-not-follow-back" | "recent-unfollower" | "manual";
export type QueueStatus = "pending" | "completed" | "skipped";

export interface QueueItemRecord {
  id: string;
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  addedAt: string; // ISO timestamp
  source: QueueSource;
  status: QueueStatus;
}

export interface SettingsRecord {
  id: "app";
  lastViewedSnapshot: string | null;
  onboardingCompleted: boolean;
  reducedMotionOverride: "system" | "reduced" | "full";
}

export const SCHEMA_VERSION = 1;
