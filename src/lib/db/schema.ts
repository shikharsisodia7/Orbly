import type { DatasetValidity, ProfileReferenceCounts, ValidityReason } from "@/lib/instagram/validity";
import type { DateRangeSource } from "@/lib/instagram/types";

export interface SnapshotRecord {
  id: string;
  createdAt: string; // ISO timestamp — when this snapshot was created in Orbly
  importedAt: string; // ISO timestamp — when the export file was processed
  label?: string;
  followersCount: number;
  followingCount: number;
  datasetHash: string;
  originalFileName: string | null;
  /**
   * The date window Meta said the source export covered. Absent on snapshots
   * imported from formats that don't declare one (e.g. JSON exports).
   */
  coverageFromIso?: string | null;
  coverageToIso?: string | null;
  /** True when the source export was too narrow to be a true all-time export. */
  coverageLooksLimited?: boolean;
  /** Whether the date range above is Meta's own explicit statement, or unknown/absent. Never inferred from relationship timestamps. */
  dateRangeSource: DateRangeSource;
  /** The parser build that produced this snapshot's numbers. Used to identify pre-fix imports for re-validation. */
  parserVersion: number;
  /** Whether this snapshot's followers/following can be trusted as a complete, authoritative current relationship graph. */
  validity: DatasetValidity;
  validityReasons: ValidityReason[];
  /** Optional manually-entered counts from the user's live Instagram profile, used only to verify completeness — never to fabricate relationship data. */
  profileReferenceCounts?: ProfileReferenceCounts | null;
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

/**
 * An account the user has permanently excluded from unfollow-relevant
 * suggestions (doesNotFollowBack, recent unfollowers, the queue, CSV
 * exports). Not tied to any snapshotId — like queueItems, it's keyed on
 * username alone so protection survives every future re-import.
 */
export interface ProtectedAccountRecord {
  id: string;
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  /** Freeform user-chosen tag, e.g. "verified", "brand/venue", "close friend". Never inferred. */
  label: string | null;
  dateAdded: string; // ISO timestamp
}

export const SCHEMA_VERSION = 3;
