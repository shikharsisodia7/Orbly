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
 * "username" matches every account (present now, or appearing in any future
 * re-import) whose username matches the pattern — this generalizes freely
 * since username is always known for everyone.
 *
 * "bio" can only ever be evaluated against accounts whose bio Orbly has
 * actually seen — Instagram's data export has no bio field for anyone, and
 * Orbly never bulk-fetches bios (that would mean automated per-profile
 * requests across an entire follower/following graph). A bio is only ever
 * captured one account at a time, when the user explicitly looks it up via
 * the browser extension while viewing that profile themselves. A bio rule
 * added for one account naturally applies to that account everywhere going
 * forward (doesNotFollowBack, exports, etc.) via accountBioCache, but it can
 * never retroactively match an account whose bio was never captured.
 */
export type ExclusionField = "username" | "bio";

/**
 * A pattern-based, persistent "never touch these" rule — distinct from
 * ProtectedAccountRecord, which pins one specific already-known username.
 * Applied everywhere ProtectedAccountRecord is: doesNotFollowBack, recent
 * unfollowers, the queue's suggestions, CSV exports.
 */
export interface ExclusionRuleRecord {
  id: string;
  /** Normalized (trimmed, lowercased, @ stripped for username; trimmed+lowercased for bio) — what's actually matched against. */
  pattern: string;
  /** Exactly what the user typed, for display. */
  rawPattern: string;
  matchMode: ExclusionMatchMode;
  /** Which field of an account this rule is evaluated against. Absent on records from before this field existed — always treated as "username" (see migrate.ts). */
  field: ExclusionField;
  /** Freeform reason, e.g. "keeping these regardless of follow-back status". */
  note: string | null;
  createdAt: string; // ISO timestamp
}

/**
 * A bio captured for exactly one account, at the moment the user explicitly
 * looked it up via the browser extension while viewing that profile
 * themselves — never bulk-fetched. &normalizedUsername: at most one cached
 * bio per account, the most recently captured one.
 */
export interface AccountBioCacheRecord {
  id: string;
  normalizedUsername: string;
  bio: string;
  fetchedAt: string; // ISO timestamp
}

export type AccountLiveStatus = "active" | "private" | "not_found";

/**
 * The result of a single, user-triggered "is this account still there"
 * check via the browser extension, while the user was actively viewing that
 * profile — never bulk-checked across a whole list. "not_found" (the
 * profile page itself reports unavailable) is the one status that excludes
 * an account from every list, the same way a deleted-placeholder username
 * already does; "private" is informational only, since a private account is
 * still a real, active account.
 */
export interface AccountStatusCacheRecord {
  id: string;
  normalizedUsername: string;
  status: AccountLiveStatus;
  checkedAt: string; // ISO timestamp
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

export const SCHEMA_VERSION = 5;
