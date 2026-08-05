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

export type ExclusionMatchMode = "contains" | "startsWith" | "endsWith";

/**
 * A pattern-based, persistent "never touch these" rule — distinct from
 * ProtectedAccountRecord, which pins one specific already-known username.
 * This instead matches against USERNAME text (Instagram's export has no
 * bio field, so a rule can only ever match on username) for every account,
 * present now or appearing in any future re-import, so a rule like "nothing
 * with nba in the name" keeps working on accounts that don't exist yet.
 * Applied everywhere ProtectedAccountRecord is: doesNotFollowBack, recent
 * unfollowers, the queue's suggestions, CSV exports.
 */
export interface ExclusionRuleRecord {
  id: string;
  /** Normalized (trimmed, lowercased, @ stripped) — what's actually matched against. */
  pattern: string;
  /** Exactly what the user typed, for display. */
  rawPattern: string;
  matchMode: ExclusionMatchMode;
  /** Freeform reason, e.g. "keeping these regardless of follow-back status". */
  note: string | null;
  createdAt: string; // ISO timestamp
}

export type FeedbackCategory =
  | "stale-data"
  | "not-saving"
  | "wrong-count"
  | "ui-issue"
  | "feature-request"
  | "other";

export type FeedbackStatus = "new" | "auto-resolved" | "reviewed";

/**
 * A self-service bug report or feedback note, submitted from inside the app
 * (Help & Feedback page) instead of requiring terminal/GitHub access.
 * Stored locally like everything else in Orbly — never sent anywhere — and
 * keyword-triaged into `category` so a matching known issue can offer an
 * immediate in-app fix (see triage.ts) rather than just sitting unread.
 */
export interface FeedbackReportRecord {
  id: string;
  message: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  /** Which page the user was on when they opened the feedback form, if known. */
  pageContext: string | null;
  createdAt: string; // ISO timestamp
}

export const SCHEMA_VERSION = 4;
