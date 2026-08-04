import { getDb } from "@/lib/db";
import { recordToRelationship } from "@/lib/db/mappers";
import {
  getAllSnapshots,
  getProtectedAccounts,
  getProtectedUsernames,
  getSnapshotById,
  protectAccount as dbProtectAccount,
  unprotectAccount as dbUnprotectAccount,
} from "@/lib/db/queries";
import type { SnapshotRecord } from "@/lib/db/schema";
import { computeCurrentRelationships, computeSnapshotChanges } from "./comparisons";
import {
  buildAccountStats,
  buildCSVFilename,
  buildRelationshipCSV,
  CSV_LIST_LABELS,
  lookupAccount,
  searchAndPaginate,
  type PaginatedResult,
} from "./chat-data";
import { buildProfileUrl } from "./normalize";
import { computeLostFollowerEvents } from "@/hooks/useLostFollowerEvents";
import type {
  PaginatedListInput,
  CheckAccountInput,
  DoesNotFollowBackInput,
  ExportListAsCSVInput,
  ListRecentUnfollowersInput,
  ProtectAccountInput,
  UnprotectAccountInput,
} from "./chat-tool-schemas";

/**
 * Browser-only executors for the AI chat feature's client-side tools. Each
 * function is called from the chat page's onToolCall handler and reads
 * directly from the same IndexedDB data every other page in the app uses —
 * nothing here is persisted or computed anywhere but the user's own browser.
 */

function isUsable(s: SnapshotRecord): boolean {
  return s.validity !== "partial" && s.validity !== "invalid";
}

async function getLatestUsableSnapshot(): Promise<SnapshotRecord | null> {
  const all = await getAllSnapshots();
  return all.find(isUsable) ?? null;
}

async function getRelationshipsForSnapshot(snapshotId: string) {
  const db = getDb();
  const [followerRows, followingRows] = await Promise.all([
    db.snapshotFollowers.where("snapshotId").equals(snapshotId).toArray(),
    db.snapshotFollowing.where("snapshotId").equals(snapshotId).toArray(),
  ]);
  return {
    followers: followerRows.map(recordToRelationship),
    following: followingRows.map(recordToRelationship),
  };
}

/**
 * Usernames the user has already resolved via the queue — either marked
 * "unfollowed" (completed) or explicitly "skipped" (from this chat's
 * interactive list, or the older dashboard's Queue page — both write to the
 * same table). Keyed on username alone, never on which snapshot produced the
 * suggestion, so this stays valid across every future import: hiding them
 * here is what keeps a repeated "who doesn't follow me back" from
 * re-surfacing someone already dealt with, no matter how many new snapshots
 * get imported afterward.
 */
async function getResolvedUsernames(): Promise<Set<string>> {
  const resolved = await getDb().queueItems.where("status").anyOf(["completed", "skipped"]).toArray();
  return new Set(resolved.map((item) => item.normalizedUsername));
}

const NO_DATA_RESULT = {
  available: false as const,
  message:
    "No usable Instagram data has been imported into Orbly yet (or the only snapshot imported is partial/invalid). Tell the user to upload their Instagram export using the drag-and-drop box at the top of this chat page — there's no separate import page.",
};

export async function getAccountStats() {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const resolved = await getResolvedUsernames();
  const stats = buildAccountStats(followers, following);
  return {
    available: true as const,
    snapshotImportedAt: snapshot.importedAt,
    snapshotLabel: snapshot.label ?? null,
    ...stats,
    // The raw don't-follow-back count is a fact about the snapshot; the
    // outstanding count also accounts for ones the user already marked
    // unfollowed since that snapshot was taken, matching the list itself.
    doesNotFollowBackCount: Math.max(0, stats.doesNotFollowBackCount - resolved.size),
  };
}

async function listFromBreakdown(
  input: PaginatedListInput & { includeProtected?: boolean },
  pick: (breakdown: ReturnType<typeof computeCurrentRelationships>) => ReturnType<typeof computeCurrentRelationships>["mutuals"],
  options: { excludeResolved: boolean; excludeProtected: boolean }
): Promise<{ available: true; result: PaginatedResult } | typeof NO_DATA_RESULT> {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const breakdown = computeCurrentRelationships(followers, following);
  let filtered = pick(breakdown);
  if (options.excludeResolved) {
    const resolved = await getResolvedUsernames();
    if (resolved.size > 0) filtered = filtered.filter((r) => !resolved.has(r.normalizedUsername));
  }
  if (options.excludeProtected && !input.includeProtected) {
    const protectedUsernames = await getProtectedUsernames();
    if (protectedUsernames.size > 0) filtered = filtered.filter((r) => !protectedUsernames.has(r.normalizedUsername));
  }
  return { available: true, result: searchAndPaginate(filtered, input) };
}

export async function listDoesNotFollowBack(input: DoesNotFollowBackInput) {
  return listFromBreakdown(input, (b) => b.doesNotFollowBack, { excludeResolved: true, excludeProtected: true });
}

export async function listMutuals(input: PaginatedListInput) {
  return listFromBreakdown(input, (b) => b.mutuals, { excludeResolved: false, excludeProtected: false });
}

export async function listYouDontFollowBack(input: PaginatedListInput) {
  return listFromBreakdown(input, (b) => b.youDontFollowBack, { excludeResolved: false, excludeProtected: false });
}

export async function checkAccount(input: CheckAccountInput) {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  return { available: true as const, ...lookupAccount(followers, following, input.username) };
}

export async function listRecentUnfollowers(input: ListRecentUnfollowersInput) {
  const allEvents = await computeLostFollowerEvents();
  if (allEvents === undefined) {
    return NO_DATA_RESULT;
  }
  const protectedUsernames = input.includeProtected ? new Set<string>() : await getProtectedUsernames();
  const events =
    protectedUsernames.size === 0 ? allEvents : allEvents.filter((e) => !protectedUsernames.has(e.normalizedUsername));
  const hiddenForProtection = allEvents.length - events.length;

  if (events.length === 0) {
    const snapshotCount = (await getAllSnapshots()).length;
    return {
      available: true as const,
      total: 0,
      events: [],
      note:
        snapshotCount < 2
          ? "Only one snapshot has been imported, so there's no history to compare — this requires at least two imports over time."
          : hiddenForProtection > 0
            ? "No lost followers to show — the only ones detected are accounts marked protected. Ask to include protected accounts to see them."
            : "No lost followers detected between any of the imported snapshots.",
    };
  }
  const limit = Math.min(input.limit ?? 50, 200);
  const page = events.slice(0, limit);
  return {
    available: true as const,
    total: events.length,
    events: page.map((e) => ({
      username: e.displayUsername,
      profileUrl: e.profileUrl,
      unfollowedBetween: { from: e.fromSnapshot.createdAt, to: e.toSnapshot.createdAt },
      stillFollowingThemNow: e.stillFollowingThem,
    })),
  };
}

export async function listSnapshots() {
  const all = await getAllSnapshots();
  return {
    available: true as const,
    total: all.length,
    snapshots: all.map((s) => ({
      importedAt: s.importedAt,
      label: s.label ?? null,
      followerCount: s.followersCount,
      followingCount: s.followingCount,
      validity: s.validity,
      validityReasons: s.validityReasons,
    })),
  };
}

export async function getQueueStatus() {
  const db = getDb();
  const items = await db.queueItems.toArray();
  return {
    available: true as const,
    pending: items.filter((i) => i.status === "pending").length,
    completed: items.filter((i) => i.status === "completed").length,
    skipped: items.filter((i) => i.status === "skipped").length,
  };
}

async function resolveSnapshot(snapshotId?: string): Promise<SnapshotRecord | null> {
  if (snapshotId) {
    const s = await getSnapshotById(snapshotId);
    return s && isUsable(s) ? s : null;
  }
  return getLatestUsableSnapshot();
}

/**
 * Resolves the two snapshots to diff for a change-event CSV export. A
 * caller-supplied pair is honored only if both IDs are given and usable;
 * otherwise (including a partial pair) this falls back to the two most
 * recent usable snapshots, same as the rest of the app's change-detection.
 */
async function resolveSnapshotPair(
  fromId?: string,
  toId?: string
): Promise<{ from: SnapshotRecord; to: SnapshotRecord } | null> {
  if (fromId && toId) {
    const [from, to] = await Promise.all([getSnapshotById(fromId), getSnapshotById(toId)]);
    if (from && to && isUsable(from) && isUsable(to)) return { from, to };
    return null;
  }
  const usable = (await getAllSnapshots()).filter(isUsable); // newest first
  if (usable.length < 2) return null;
  return { from: usable[1], to: usable[0] };
}

const NO_SNAPSHOT_PAIR_RESULT = {
  available: false as const,
  message:
    "At least two usable Instagram snapshots are needed to compute lost/new followers, and either fewer than two are on file or the requested snapshot pair isn't usable. Tell the user to import another export over time to unlock this.",
};

export async function exportListAsCSV(input: ExportListAsCSVInput) {
  const { listType } = input;
  const label = CSV_LIST_LABELS[listType];

  if (listType === "lostFollowers" || listType === "newFollowers") {
    const pair = await resolveSnapshotPair(input.fromSnapshotId, input.toSnapshotId);
    if (!pair) return NO_SNAPSHOT_PAIR_RESULT;

    const [fromData, toData] = await Promise.all([
      getRelationshipsForSnapshot(pair.from.id),
      getRelationshipsForSnapshot(pair.to.id),
    ]);
    const changes = computeSnapshotChanges(
      fromData.followers,
      toData.followers,
      fromData.following,
      toData.following
    );
    const picked = listType === "lostFollowers" ? changes.lostFollowers : changes.newFollowers;
    const detectedAt = `${pair.from.importedAt} to ${pair.to.importedAt}`;

    return {
      available: true as const,
      listType,
      label,
      rowCount: picked.length,
      filename: buildCSVFilename(listType, pair.to.importedAt),
      csv: buildRelationshipCSV(picked, detectedAt),
      rangeFromImportedAt: pair.from.importedAt,
      rangeToImportedAt: pair.to.importedAt,
    };
  }

  const snapshot = await resolveSnapshot(input.snapshotId);
  if (!snapshot) return NO_DATA_RESULT;

  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const breakdown = computeCurrentRelationships(followers, following);
  const picked =
    listType === "mutuals"
      ? breakdown.mutuals
      : listType === "notFollowingBack"
        ? breakdown.doesNotFollowBack
        : breakdown.youDontFollowBack;

  // notFollowingBack mirrors listDoesNotFollowBack's resolved-queue and
  // protected-account exclusions, so an export matches what the chat would
  // say if asked right now — mutuals/nonMutualFollowers have no such concept
  // (see getResolvedUsernames above).
  let filtered = picked;
  if (listType === "notFollowingBack") {
    const resolved = await getResolvedUsernames();
    if (resolved.size > 0) filtered = filtered.filter((r) => !resolved.has(r.normalizedUsername));
    if (!input.includeProtected) {
      const protectedUsernames = await getProtectedUsernames();
      if (protectedUsernames.size > 0) filtered = filtered.filter((r) => !protectedUsernames.has(r.normalizedUsername));
    }
  }

  return {
    available: true as const,
    listType,
    label,
    rowCount: filtered.length,
    filename: buildCSVFilename(listType, snapshot.importedAt),
    csv: buildRelationshipCSV(filtered),
    snapshotImportedAt: snapshot.importedAt,
  };
}

function normalizeUsernameInput(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export async function protectAccount(input: ProtectAccountInput) {
  const normalized = normalizeUsernameInput(input.username);
  const record = await dbProtectAccount({
    normalizedUsername: normalized,
    displayUsername: normalized,
    profileUrl: buildProfileUrl(normalized),
    label: input.label ?? null,
  });
  return {
    available: true as const,
    normalizedUsername: record.normalizedUsername,
    label: record.label,
    dateAdded: record.dateAdded,
  };
}

export async function unprotectAccount(input: UnprotectAccountInput) {
  const normalized = normalizeUsernameInput(input.username);
  const wasProtected = await dbUnprotectAccount(normalized);
  return { available: true as const, normalizedUsername: normalized, wasProtected };
}

export async function listProtectedAccounts() {
  const accounts = await getProtectedAccounts();
  return {
    available: true as const,
    total: accounts.length,
    accounts: accounts.map((a) => ({
      username: a.displayUsername,
      normalizedUsername: a.normalizedUsername,
      label: a.label,
      dateAdded: a.dateAdded,
    })),
  };
}
