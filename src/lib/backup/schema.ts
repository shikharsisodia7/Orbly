import { z } from "zod";

const validityReasonSchema = z.enum([
  "DATE_RANGE_NOT_ALL_TIME",
  "FOLLOWERS_MISSING",
  "FOLLOWING_MISSING",
  "PARSER_FAILURE",
  "FOLLOWER_COUNT_MISMATCH",
  "FOLLOWING_COUNT_MISMATCH",
  "UNKNOWN_EXPORT_RANGE",
  "DUPLICATE_IMPORT",
]);

export const backupSnapshotSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  importedAt: z.string(),
  label: z.string().optional(),
  followersCount: z.number(),
  followingCount: z.number(),
  datasetHash: z.string(),
  originalFileName: z.string().nullable(),
  coverageFromIso: z.string().nullable().optional(),
  coverageToIso: z.string().nullable().optional(),
  coverageLooksLimited: z.boolean().optional(),
  // Optional so backups made before validity tracking existed still restore —
  // normalizeSnapshotRecord() backfills these on the way back in.
  dateRangeSource: z.enum(["meta-explicit", "unknown"]).optional(),
  parserVersion: z.number().optional(),
  validity: z.enum(["complete", "partial", "unverified", "invalid"]).optional(),
  validityReasons: z.array(validityReasonSchema).optional(),
  profileReferenceCounts: z
    .object({ followers: z.number(), following: z.number(), recordedAt: z.string() })
    .nullable()
    .optional(),
});

export const backupRelationshipSchema = z.object({
  id: z.string(),
  snapshotId: z.string(),
  normalizedUsername: z.string(),
  displayUsername: z.string(),
  profileUrl: z.string(),
  instagramTimestamp: z.number().nullable(),
});

export const backupQueueItemSchema = z.object({
  id: z.string(),
  normalizedUsername: z.string(),
  displayUsername: z.string(),
  profileUrl: z.string(),
  addedAt: z.string(),
  source: z.enum(["does-not-follow-back", "recent-unfollower", "manual"]),
  status: z.enum(["pending", "completed", "skipped"]),
});

export const backupSettingsSchema = z.object({
  id: z.literal("app"),
  lastViewedSnapshot: z.string().nullable(),
  onboardingCompleted: z.boolean(),
  reducedMotionOverride: z.enum(["system", "reduced", "full"]),
});

export const backupProtectedAccountSchema = z.object({
  id: z.string(),
  normalizedUsername: z.string(),
  displayUsername: z.string(),
  profileUrl: z.string(),
  label: z.string().nullable(),
  dateAdded: z.string(),
});

export const backupExclusionRuleSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  rawPattern: z.string(),
  matchMode: z.enum(["contains", "startsWith", "endsWith"]),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const backupFeedbackReportSchema = z.object({
  id: z.string(),
  message: z.string(),
  category: z.enum(["stale-data", "not-saving", "wrong-count", "ui-issue", "feature-request", "other"]),
  status: z.enum(["new", "auto-resolved", "reviewed"]),
  pageContext: z.string().nullable(),
  createdAt: z.string(),
});

export const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  snapshots: z.array(backupSnapshotSchema),
  snapshotFollowers: z.array(backupRelationshipSchema),
  snapshotFollowing: z.array(backupRelationshipSchema),
  queueItems: z.array(backupQueueItemSchema),
  settings: backupSettingsSchema.nullable(),
  // Every field below is optional so a backup made before that feature
  // existed still restores cleanly — absent (not an empty-array vs. missing
  // distinction) means "this backup predates the feature," restored as
  // none of that data rather than failing validation. This was a real bug
  // once already (protectedAccounts was silently dropped by backup/restore
  // for a while) — new tables must be added here the moment they're added
  // to the schema, not as an afterthought.
  protectedAccounts: z.array(backupProtectedAccountSchema).optional(),
  exclusionRules: z.array(backupExclusionRuleSchema).optional(),
  feedbackReports: z.array(backupFeedbackReportSchema).optional(),
});

export type BackupFile = z.infer<typeof backupFileSchema>;
