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

export const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  snapshots: z.array(backupSnapshotSchema),
  snapshotFollowers: z.array(backupRelationshipSchema),
  snapshotFollowing: z.array(backupRelationshipSchema),
  queueItems: z.array(backupQueueItemSchema),
  settings: backupSettingsSchema.nullable(),
});

export type BackupFile = z.infer<typeof backupFileSchema>;
