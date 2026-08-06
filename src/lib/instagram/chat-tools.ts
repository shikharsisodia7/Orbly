import { getDb } from "@/lib/db";
import { recordToRelationship } from "@/lib/db/mappers";
import {
  addExclusionRule as dbAddExclusionRule,
  getAccountStatus,
  getAllCachedBios,
  getAllSnapshots,
  getCachedBio,
  getExclusionRules,
  getNotFoundUsernames,
  getProtectedAccounts,
  getProtectedUsernames,
  getSnapshotById,
  protectAccount as dbProtectAccount,
  removeExclusionRule as dbRemoveExclusionRule,
  unprotectAccount as dbUnprotectAccount,
} from "@/lib/db/queries";
import type { ExclusionRuleRecord, SnapshotRecord } from "@/lib/db/schema";
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
import { buildProfileUrl, normalizeUsername } from "./normalize";
import { matchesAnyExclusionRule } from "./exclusion-rules";
import { computeLostFollowerEvents } from "@/hooks/useLostFollowerEvents";
import type {
  PaginatedListInput,
  CheckAccountInput,
  DoesNotFollowBackInput,
  ExportListAsCSVInput,
  ListRecentUnfollowersInput,
  ProtectAccountInput,
  UnprotectAccountInput,
  AddExclusionRuleInput,
  RemoveExclusionRuleInput,
} from "./chat-tool-schemas";

/**
 * Browser-only executors for the AI chat feature's client-side tools. Each
 * function is called from the chat page's onToolCall handler and reads
 * directly from the same IndexedDB data every other page in the app uses —
 * nothing here is persisted or computed anywhere but the user's own browser.
 */

export function isUsable(s: SnapshotRecord): boolean {
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

/**
 * Everything needed to decide whether an account should still be actively
 * suggested (doesNotFollowBack, recent unfollowers, the queue, CSV
 * exports) — as opposed to merely listed informationally (mutuals,
 * youDontFollowBack). Bundled into one fetch so every caller applies
 * exactly the same four checks in the same order: resolved-via-queue,
 * protected, confirmed-gone-at-lookup-time, and exclusion rules (username
 * or bio, whichever the rule is scoped to).
 */
export interface SuggestionFilterContext {
  resolved: Set<string>;
  protectedUsernames: Set<string>;
  notFoundUsernames: Set<string>;
  exclusionRules: ExclusionRuleRecord[];
  bios: Map<string, string>;
}

export async function buildSuggestionFilterContext(includeProtected: boolean): Promise<SuggestionFilterContext> {
  const [resolved, protectedUsernames, notFoundUsernames, exclusionRules, bios] = await Promise.all([
    getResolvedUsernames(),
    includeProtected ? Promise.resolve(new Set<string>()) : getProtectedUsernames(),
    getNotFoundUsernames(),
    getExclusionRules(),
    getAllCachedBios(),
  ]);
  return { resolved, protectedUsernames, notFoundUsernames, exclusionRules, bios };
}

/** True if this account should still be actively suggested — false if resolved, protected, confirmed gone, or matching any exclusion rule (username or bio). */
export function isSuggestable(normalizedUsername: string, ctx: SuggestionFilterContext): boolean {
  if (ctx.resolved.has(normalizedUsername)) return false;
  if (ctx.protectedUsernames.has(normalizedUsername)) return false;
  if (ctx.notFoundUsernames.has(normalizedUsername)) return false;
  if (matchesAnyExclusionRule({ normalizedUsername, bio: ctx.bios.get(normalizedUsername) }, ctx.exclusionRules)) {
    return false;
  }
  return true;
}

export async function getAccountStats() {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const ctx = await buildSuggestionFilterContext(false);
  const stats = buildAccountStats(followers, following);
  // Counted precisely (not by subtracting set sizes from the raw total) so
  // this always matches listDoesNotFollowBack exactly, even though not
  // every resolved/protected/excluded/gone username is necessarily still in
  // the raw doesNotFollowBack set.
  const breakdown = computeCurrentRelationships(followers, following);
  const outstandingDoesNotFollowBack = breakdown.doesNotFollowBack.filter((r) =>
    isSuggestable(r.normalizedUsername, ctx)
  ).length;
  return {
    available: true as const,
    snapshotImportedAt: snapshot.importedAt,
    snapshotLabel: snapshot.label ?? null,
    ...stats,
    // The raw don't-follow-back count is a fact about the snapshot; the
    // outstanding count also accounts for ones the user already marked
    // unfollowed or protected, matching what listDoesNotFollowBack actually
    // shows.
    doesNotFollowBackCount: outstandingDoesNotFollowBack,
  };
}

async function listFromBreakdown(
  input: PaginatedListInput & { includeProtected?: boolean },
  pick: (breakdown: ReturnType<typeof computeCurrentRelationships>) => ReturnType<typeof computeCurrentRelationships>["mutuals"],
  applySuggestionFilters: boolean
): Promise<{ available: true; result: PaginatedResult } | typeof NO_DATA_RESULT> {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const breakdown = computeCurrentRelationships(followers, following);
  let filtered = pick(breakdown);
  // Resolved/protected/confirmed-gone/exclusion-rule filtering only applies
  // to doesNotFollowBack — an "act on this" list. mutuals/youDontFollowBack
  // are purely informational (who's actually in each set right now), so
  // they stay unfiltered, matching how protectedAccounts already worked
  // before exclusion rules or gone-account detection existed.
  if (applySuggestionFilters) {
    const ctx = await buildSuggestionFilterContext(!!input.includeProtected);
    filtered = filtered.filter((r) => isSuggestable(r.normalizedUsername, ctx));
  }
  return { available: true, result: searchAndPaginate(filtered, input) };
}

export async function listDoesNotFollowBack(input: DoesNotFollowBackInput) {
  return listFromBreakdown(input, (b) => b.doesNotFollowBack, true);
}

export async function listMutuals(input: PaginatedListInput) {
  return listFromBreakdown(input, (b) => b.mutuals, false);
}

export async function listYouDontFollowBack(input: PaginatedListInput) {
  return listFromBreakdown(input, (b) => b.youDontFollowBack, false);
}

export async function checkAccount(input: CheckAccountInput) {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const normalized = normalizeUsername(input.username);
  const [bio, statusRecord] = await Promise.all([getCachedBio(normalized), getAccountStatus(normalized)]);
  return {
    available: true as const,
    ...lookupAccount(followers, following, input.username),
    // Only ever present if the user previously looked this exact account up
    // via the browser extension while viewing its profile — never fetched
    // here, and never guessed at.
    bio,
    liveStatus: statusRecord?.status ?? null,
    liveStatusCheckedAt: statusRecord?.checkedAt ?? null,
  };
}

export async function listRecentUnfollowers(input: ListRecentUnfollowersInput) {
  const allEvents = await computeLostFollowerEvents();
  if (allEvents === undefined) {
    return NO_DATA_RESULT;
  }
  const ctx = await buildSuggestionFilterContext(!!input.includeProtected);
  const events = allEvents.filter((e) => isSuggestable(e.normalizedUsername, ctx));
  const hiddenForFiltering = allEvents.length - events.length;

  if (events.length === 0) {
    const snapshotCount = (await getAllSnapshots()).length;
    return {
      available: true as const,
      total: 0,
      events: [],
      note:
        snapshotCount < 2
          ? "Only one snapshot has been imported, so there's no history to compare — this requires at least two imports over time."
          : hiddenForFiltering > 0
            ? "No lost followers to show — the only ones detected are resolved in the queue, marked protected, confirmed gone, or matching an exclusion rule. Ask to include protected accounts to see those (exclusion rules and gone accounts have no override)."
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

  // notFollowingBack mirrors listDoesNotFollowBack's full suggestion
  // filtering (resolved-queue, protected, confirmed-gone, exclusion rules),
  // so an export matches what the chat would say if asked right now —
  // mutuals/nonMutualFollowers have no such concept (see getResolvedUsernames
  // above).
  let filtered = picked;
  if (listType === "notFollowingBack") {
    const ctx = await buildSuggestionFilterContext(!!input.includeProtected);
    filtered = filtered.filter((r) => isSuggestable(r.normalizedUsername, ctx));
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

function formatRule(r: ExclusionRuleRecord) {
  return { pattern: r.rawPattern, field: r.field, matchMode: r.matchMode, note: r.note, createdAt: r.createdAt };
}

/**
 * Adds a persistent, pattern-based "never suggest or include this" rule,
 * scoped to either username (matches every account) or bio (can only ever
 * match an account whose bio was explicitly captured via the browser
 * extension — see exclusion-rules.ts). The tool description and system
 * prompt are responsible for never claiming a bio rule works for an account
 * nobody has looked up.
 */
export async function addExclusionRule(input: AddExclusionRuleInput) {
  const record = await dbAddExclusionRule({
    rawPattern: input.pattern,
    matchMode: input.matchMode ?? "contains",
    field: input.field ?? "username",
    note: input.note ?? null,
  });
  return { available: true as const, rule: formatRule(record) };
}

export async function removeExclusionRule(input: RemoveExclusionRuleInput) {
  const wasRemoved = await dbRemoveExclusionRule(input.pattern, input.field ?? "username");
  return { available: true as const, pattern: input.pattern, wasRemoved };
}

export async function listExclusionRules() {
  const rules = await getExclusionRules();
  return { available: true as const, total: rules.length, rules: rules.map(formatRule) };
}
