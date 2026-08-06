import { recordToRelationship } from "@/lib/db/mappers";
import {
  getAllSnapshots,
  getFollowerCheckEntries,
  getFollowerChecks,
  getSnapshotFollowers,
  recordFollowerCheck,
} from "@/lib/db/queries";
import type { FollowerCheckSource } from "@/lib/db/schema";
import type { Relationship } from "./types";
import { diffFollowerLists } from "./follower-check";
import { buildSuggestionFilterContext, isSuggestable, isUsable } from "./chat-tools";

/**
 * Orchestrates a single "Check Now": diff a freshly-read followers list
 * against whatever followers data was most recently on file, filter the
 * unfollow side through the exact same resolved/protected/confirmed-gone/
 * exclusion-rule logic every other suggestion list uses, and persist the
 * result as a new check-in. Mirrors chat-tools.ts's own style (browser-only,
 * reads/writes IndexedDB directly) since this is exactly the same category
 * of operation, just for the fast-check feature instead of the chat.
 */

export interface CheckNowItem {
  username: string;
  normalizedUsername: string;
  profileUrl: string;
}

export interface CheckNowResult {
  available: true;
  checkedAt: string;
  previousCheckedAt: string | null;
  isFirstCheck: boolean;
  unfollowed: CheckNowItem[];
  newFollowers: CheckNowItem[];
  /** How many raw unfollows were hidden by protection/exclusion rules/confirmed-gone status. */
  excludedCount: number;
}

function toItem(r: Relationship): CheckNowItem {
  return { username: r.displayUsername, normalizedUsername: r.normalizedUsername, profileUrl: r.profileUrl };
}

interface Baseline {
  checkedAt: string;
  followers: Relationship[];
}

/**
 * The most recent followers data on file — whichever is newer between the
 * latest usable snapshot's followers and the latest check-in's followers —
 * excluding a specific snapshot/check when that snapshot is the very "fresh"
 * data this check is about to compare (so a web-import-triggered check
 * never compares a snapshot against itself).
 */
async function resolveCheckBaseline(excludeSnapshotId: string | null): Promise<Baseline | null> {
  const [snapshots, checks] = await Promise.all([getAllSnapshots(), getFollowerChecks()]);

  const latestSnapshot = snapshots.filter(isUsable).find((s) => s.id !== excludeSnapshotId) ?? null;
  // Exclude only a check tied to the exact snapshot we're comparing "fresh"
  // data against right now (the web-import case) — when excludeSnapshotId is
  // null (the extension case), every check is a valid candidate.
  const latestCheck = checks.find((c) => excludeSnapshotId === null || c.snapshotId !== excludeSnapshotId) ?? null;

  const candidates: { checkedAt: string; kind: "snapshot" | "check" }[] = [];
  if (latestSnapshot) candidates.push({ checkedAt: latestSnapshot.importedAt, kind: "snapshot" });
  if (latestCheck) candidates.push({ checkedAt: latestCheck.checkedAt, kind: "check" });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
  const winner = candidates[0];

  if (winner.kind === "snapshot" && latestSnapshot) {
    const rows = await getSnapshotFollowers(latestSnapshot.id);
    return { checkedAt: latestSnapshot.importedAt, followers: rows.map(recordToRelationship) };
  }
  if (winner.kind === "check" && latestCheck) {
    const followers = latestCheck.snapshotId
      ? (await getSnapshotFollowers(latestCheck.snapshotId)).map(recordToRelationship)
      : await getFollowerCheckEntries(latestCheck.id);
    return { checkedAt: latestCheck.checkedAt, followers };
  }
  return null;
}

/**
 * Runs one Check Now: freshFollowers is whatever was just read (a live DOM
 * scrape from the extension, or the followers of a snapshot the user just
 * imported). `snapshotId` should be set only in the web-import case, so the
 * resulting check-in reuses that snapshot's data instead of duplicating it,
 * and so the baseline lookup correctly skips that same snapshot instead of
 * comparing it against itself.
 */
export async function runCheckNow(
  freshFollowers: Relationship[],
  source: FollowerCheckSource,
  snapshotId: string | null = null
): Promise<CheckNowResult> {
  const baseline = await resolveCheckBaseline(snapshotId);
  const diff = baseline
    ? diffFollowerLists(baseline.followers, freshFollowers)
    : { unfollowed: [], newFollowers: freshFollowers };

  const ctx = await buildSuggestionFilterContext(false);
  const filteredUnfollowed = diff.unfollowed.filter((r) => isSuggestable(r.normalizedUsername, ctx));
  const excludedCount = diff.unfollowed.length - filteredUnfollowed.length;

  const record = await recordFollowerCheck({
    source,
    snapshotId,
    comparedToCheckedAt: baseline?.checkedAt ?? null,
    unfollowedCount: filteredUnfollowed.length,
    newFollowerCount: diff.newFollowers.length,
    excludedCount,
    followers: snapshotId ? null : freshFollowers,
  });

  return {
    available: true,
    checkedAt: record.checkedAt,
    previousCheckedAt: baseline?.checkedAt ?? null,
    isFirstCheck: baseline === null,
    unfollowed: filteredUnfollowed.map(toItem),
    newFollowers: diff.newFollowers.map(toItem),
    excludedCount,
  };
}
