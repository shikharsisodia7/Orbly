import { getDb } from "@/lib/db";
import { recordToRelationship } from "@/lib/db/mappers";
import { getAllSnapshots } from "@/lib/db/queries";
import type { SnapshotRecord } from "@/lib/db/schema";
import { computeCurrentRelationships } from "./comparisons";
import { buildAccountStats, lookupAccount, searchAndPaginate, type PaginatedResult } from "./chat-data";
import { computeLostFollowerEvents } from "@/hooks/useLostFollowerEvents";
import type { PaginatedListInput, CheckAccountInput, ListRecentUnfollowersInput } from "./chat-tool-schemas";

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
 * Usernames the user has already marked "unfollowed" via the queue (either
 * from this chat's interactive list, or the older dashboard's Queue page —
 * both write to the same table). The current snapshot was taken before that
 * happened, so its raw export still lists them; hiding them here is what
 * keeps a repeated "who doesn't follow me back" from re-surfacing someone
 * already handled. They reappear correctly, or drop out for good, on the
 * next re-import.
 */
async function getResolvedUsernames(): Promise<Set<string>> {
  const completed = await getDb().queueItems.where("status").equals("completed").toArray();
  return new Set(completed.map((item) => item.normalizedUsername));
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
  input: PaginatedListInput,
  pick: (breakdown: ReturnType<typeof computeCurrentRelationships>) => ReturnType<typeof computeCurrentRelationships>["mutuals"],
  excludeResolved: boolean
): Promise<{ available: true; result: PaginatedResult } | typeof NO_DATA_RESULT> {
  const snapshot = await getLatestUsableSnapshot();
  if (!snapshot) return NO_DATA_RESULT;
  const { followers, following } = await getRelationshipsForSnapshot(snapshot.id);
  const breakdown = computeCurrentRelationships(followers, following);
  const picked = pick(breakdown);
  const filtered = excludeResolved
    ? await (async () => {
        const resolved = await getResolvedUsernames();
        return resolved.size === 0 ? picked : picked.filter((r) => !resolved.has(r.normalizedUsername));
      })()
    : picked;
  return { available: true, result: searchAndPaginate(filtered, input) };
}

export async function listDoesNotFollowBack(input: PaginatedListInput) {
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
  return { available: true as const, ...lookupAccount(followers, following, input.username) };
}

export async function listRecentUnfollowers(input: ListRecentUnfollowersInput) {
  const events = await computeLostFollowerEvents();
  if (events === undefined) {
    return NO_DATA_RESULT;
  }
  if (events.length === 0) {
    const snapshotCount = (await getAllSnapshots()).length;
    return {
      available: true as const,
      total: 0,
      events: [],
      note:
        snapshotCount < 2
          ? "Only one snapshot has been imported, so there's no history to compare — this requires at least two imports over time."
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
