import { getDb } from "./index";
import type {
  AccountBioCacheRecord,
  AccountLiveStatus,
  AccountStatusCacheRecord,
  ExclusionField,
  ExclusionMatchMode,
  ExclusionRuleRecord,
  FeedbackCategory,
  FeedbackReportRecord,
  ProtectedAccountRecord,
  QueueItemRecord,
  QueueSource,
  QueueStatus,
  SettingsRecord,
  SnapshotFollowerRecord,
  SnapshotFollowingRecord,
  SnapshotRecord,
} from "./schema";
import type { ExportCoverage, Relationship } from "@/lib/instagram/types";
import { PARSER_VERSION } from "@/lib/instagram/parser";
import { assessDatasetValidity, type ProfileReferenceCounts } from "@/lib/instagram/validity";
import { normalizeQueryText } from "@/lib/instagram/text-match";

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
  /** Manually-entered counts from the user's live Instagram profile, used only to verify completeness. */
  profileReference?: ProfileReferenceCounts | null;
}

export async function createSnapshot(input: CreateSnapshotInput): Promise<SnapshotRecord> {
  const db = getDb();
  const now = new Date().toISOString();

  const { validity, reasons } = assessDatasetValidity({
    followerCount: input.followers.length,
    followingCount: input.following.length,
    coverage: input.coverage ?? null,
    profileReference: input.profileReference ?? null,
  });

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
    dateRangeSource: input.coverage ? "meta-explicit" : "unknown",
    parserVersion: PARSER_VERSION,
    validity,
    validityReasons: reasons,
    profileReferenceCounts: input.profileReference ?? null,
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
    [
      db.snapshots,
      db.snapshotFollowers,
      db.snapshotFollowing,
      db.queueItems,
      db.settings,
      db.protectedAccounts,
      db.exclusionRules,
      db.feedbackReports,
      db.accountBioCache,
      db.accountStatusCache,
    ],
    async () => {
      await db.snapshots.clear();
      await db.snapshotFollowers.clear();
      await db.snapshotFollowing.clear();
      await db.queueItems.clear();
      await db.settings.clear();
      await db.protectedAccounts.clear();
      await db.exclusionRules.clear();
      await db.feedbackReports.clear();
      await db.accountBioCache.clear();
      await db.accountStatusCache.clear();
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

export interface MarkAccountUnfollowedInput {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
}

/**
 * Records that the user says they've already unfollowed this account
 * outside Orbly (Orbly has no live connection to Instagram and can't
 * detect it itself). Inserted straight into the queue as "completed" —
 * or flips an existing pending entry to completed — so it's reflected
 * immediately in the chat's interactive list and in the Queue page's
 * history, without waiting for the next re-import to reconcile it.
 */
export async function markAccountUnfollowed(item: MarkAccountUnfollowedInput): Promise<void> {
  const db = getDb();
  const existing = await db.queueItems.where("normalizedUsername").equals(item.normalizedUsername).first();
  if (existing) {
    await db.queueItems.update(existing.id, { status: "completed" });
    return;
  }
  await db.queueItems.add({
    id: newId(),
    normalizedUsername: item.normalizedUsername,
    displayUsername: item.displayUsername,
    profileUrl: item.profileUrl,
    addedAt: new Date().toISOString(),
    source: "does-not-follow-back",
    status: "completed",
  });
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

// --- Protected accounts ---

export async function getProtectedAccounts(): Promise<ProtectedAccountRecord[]> {
  const all = await getDb().protectedAccounts.toArray();
  return all.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
}

export async function getProtectedUsernames(): Promise<Set<string>> {
  const all = await getDb().protectedAccounts.toArray();
  return new Set(all.map((item) => item.normalizedUsername));
}

export interface ProtectAccountInput {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  label?: string | null;
}

/**
 * Marks an account protected, or updates its label if it's already
 * protected — never creates a duplicate record for the same username, since
 * &normalizedUsername is a unique index.
 */
export async function protectAccount(input: ProtectAccountInput): Promise<ProtectedAccountRecord> {
  const db = getDb();
  const existing = await db.protectedAccounts.where("normalizedUsername").equals(input.normalizedUsername).first();
  if (existing) {
    const updated: ProtectedAccountRecord = { ...existing, label: input.label ?? existing.label };
    await db.protectedAccounts.put(updated);
    return updated;
  }
  const record: ProtectedAccountRecord = {
    id: newId(),
    normalizedUsername: input.normalizedUsername,
    displayUsername: input.displayUsername,
    profileUrl: input.profileUrl,
    label: input.label ?? null,
    dateAdded: new Date().toISOString(),
  };
  await db.protectedAccounts.add(record);
  return record;
}

/** Returns true if the account was protected and is now removed, false if it wasn't protected. */
export async function unprotectAccount(normalizedUsername: string): Promise<boolean> {
  const db = getDb();
  const existing = await db.protectedAccounts.where("normalizedUsername").equals(normalizedUsername).first();
  if (!existing) return false;
  await db.protectedAccounts.delete(existing.id);
  return true;
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

// --- Exclusion rules (pattern-based, persistent "never touch these") ---

export interface AddExclusionRuleInput {
  rawPattern: string;
  matchMode: ExclusionMatchMode;
  /** Defaults to "username" — the only kind that existed before bio rules. */
  field?: ExclusionField;
  note?: string | null;
}

/**
 * Adds a persistent exclusion rule, or updates the existing rule's mode/note
 * if the same normalized pattern is added again for the same field —
 * &[field+pattern] is a unique compound index, so "nba" as a username rule
 * and "nba" as a bio rule are independent and can coexist, but re-adding the
 * exact same field+pattern pair updates the existing rule rather than
 * duplicating it.
 */
export async function addExclusionRule(input: AddExclusionRuleInput): Promise<ExclusionRuleRecord> {
  const db = getDb();
  const field: ExclusionField = input.field ?? "username";
  const pattern = normalizeQueryText(input.rawPattern);
  const existing = await db.exclusionRules.where("[field+pattern]").equals([field, pattern]).first();
  if (existing) {
    const updated: ExclusionRuleRecord = {
      ...existing,
      matchMode: input.matchMode,
      note: input.note ?? existing.note,
    };
    await db.exclusionRules.put(updated);
    return updated;
  }
  const record: ExclusionRuleRecord = {
    id: newId(),
    pattern,
    rawPattern: input.rawPattern.trim(),
    matchMode: input.matchMode,
    field,
    note: input.note ?? null,
    createdAt: new Date().toISOString(),
  };
  await db.exclusionRules.add(record);
  return record;
}

/** Returns true if a matching rule was found and removed, false if there was nothing to remove. */
export async function removeExclusionRule(rawPattern: string, field: ExclusionField = "username"): Promise<boolean> {
  const db = getDb();
  const pattern = normalizeQueryText(rawPattern);
  const existing = await db.exclusionRules.where("[field+pattern]").equals([field, pattern]).first();
  if (!existing) return false;
  await db.exclusionRules.delete(existing.id);
  return true;
}

export async function getExclusionRules(): Promise<ExclusionRuleRecord[]> {
  const all = await getDb().exclusionRules.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Account bio cache (one account at a time, via the browser extension) ---

/**
 * Caches the bio text for one account, captured by the browser extension at
 * the moment the user was actively viewing that profile — never bulk
 * fetched. &normalizedUsername: re-capturing the same account overwrites
 * its previous bio rather than accumulating history.
 */
export async function cacheAccountBio(normalizedUsername: string, bio: string): Promise<AccountBioCacheRecord> {
  const db = getDb();
  const existing = await db.accountBioCache.where("normalizedUsername").equals(normalizedUsername).first();
  const record: AccountBioCacheRecord = {
    id: existing?.id ?? newId(),
    normalizedUsername,
    bio,
    fetchedAt: new Date().toISOString(),
  };
  await db.accountBioCache.put(record);
  return record;
}

export async function getCachedBio(normalizedUsername: string): Promise<string | null> {
  const record = await getDb().accountBioCache.where("normalizedUsername").equals(normalizedUsername).first();
  return record?.bio ?? null;
}

/** Every captured bio, keyed by normalized username — used to evaluate bio exclusion rules across a list without a per-row DB round trip. */
export async function getAllCachedBios(): Promise<Map<string, string>> {
  const all = await getDb().accountBioCache.toArray();
  return new Map(all.map((r) => [r.normalizedUsername, r.bio]));
}

// --- Account live-status cache (one account at a time, via the browser extension) ---

/**
 * Records the live status of one account, checked by the browser extension
 * at the moment the user was actively viewing that profile — never bulk
 * checked. &normalizedUsername: the most recent check wins.
 */
export async function setAccountStatus(
  normalizedUsername: string,
  status: AccountLiveStatus
): Promise<AccountStatusCacheRecord> {
  const db = getDb();
  const existing = await db.accountStatusCache.where("normalizedUsername").equals(normalizedUsername).first();
  const record: AccountStatusCacheRecord = {
    id: existing?.id ?? newId(),
    normalizedUsername,
    status,
    checkedAt: new Date().toISOString(),
  };
  await db.accountStatusCache.put(record);
  return record;
}

export async function getAccountStatus(normalizedUsername: string): Promise<AccountStatusCacheRecord | undefined> {
  return getDb().accountStatusCache.where("normalizedUsername").equals(normalizedUsername).first();
}

/** Usernames confirmed gone (banned/deactivated/deleted) at the time they were last looked up — excluded from every list, the same way a deleted-placeholder username already is. */
export async function getNotFoundUsernames(): Promise<Set<string>> {
  const all = await getDb().accountStatusCache.where("status").equals("not_found").toArray();
  return new Set(all.map((r) => r.normalizedUsername));
}

// --- Feedback reports (self-service, in-app bug reports) ---

export interface SubmitFeedbackInput {
  message: string;
  category: FeedbackCategory;
  pageContext?: string | null;
}

export async function submitFeedback(input: SubmitFeedbackInput): Promise<FeedbackReportRecord> {
  const record: FeedbackReportRecord = {
    id: newId(),
    message: input.message.trim(),
    category: input.category,
    status: "new",
    pageContext: input.pageContext ?? null,
    createdAt: new Date().toISOString(),
  };
  await getDb().feedbackReports.add(record);
  return record;
}

export async function getFeedbackReports(): Promise<FeedbackReportRecord[]> {
  const all = await getDb().feedbackReports.toArray();
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackReportRecord["status"]
): Promise<void> {
  await getDb().feedbackReports.update(id, { status });
}

export async function deleteFeedbackReport(id: string): Promise<void> {
  await getDb().feedbackReports.delete(id);
}
