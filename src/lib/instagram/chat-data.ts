import type { Relationship } from "./types";
import { computeCurrentRelationships } from "./comparisons";

/**
 * Pure, framework-agnostic helpers the AI chat feature uses to turn a
 * snapshot's already-parsed relationship data into small, model-friendly
 * answers. Kept separate from the Dexie-backed lookups in chat-tools.ts so
 * this logic can be unit tested without touching IndexedDB.
 */

export interface PaginatedResult {
  total: number;
  items: Array<{ username: string; normalizedUsername: string; profileUrl: string }>;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function toItem(rel: Relationship) {
  return { username: rel.displayUsername, normalizedUsername: rel.normalizedUsername, profileUrl: rel.profileUrl };
}

/**
 * Filters by a case-insensitive substring match on the username, then
 * paginates either by numeric offset or by an `after` cursor.
 *
 * `after` (a normalizedUsername) is the stable option: it means "the next
 * items alphabetically past this username," which stays correct even if
 * items earlier in the sorted list have since been excluded (e.g. marked
 * resolved in the unfollow queue) — a plain numeric offset would silently
 * skip or repeat items once the underlying list has shrunk out from under
 * it. Callers doing one-at-a-time replenishment (the interactive
 * doesn't-follow-back list) should always use `after`, not `offset`.
 */
export function searchAndPaginate(
  list: Relationship[],
  options: { query?: string; offset?: number; after?: string; limit?: number } = {}
): PaginatedResult {
  const { query, offset = 0, after, limit = DEFAULT_LIMIT } = options;
  const boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  const filtered = query
    ? list.filter((r) => r.normalizedUsername.includes(query.trim().toLowerCase().replace(/^@+/, "")))
    : list;

  const sorted = [...filtered].sort((a, b) => a.normalizedUsername.localeCompare(b.normalizedUsername));

  const startIndex = after ? sorted.findIndex((r) => r.normalizedUsername > after) : offset;
  const effectiveStart = startIndex === -1 ? sorted.length : startIndex;
  const page = sorted.slice(effectiveStart, effectiveStart + boundedLimit);

  return {
    total: sorted.length,
    items: page.map(toItem),
    hasMore: effectiveStart + boundedLimit < sorted.length,
  };
}

export interface AccountStats {
  followerCount: number;
  followingCount: number;
  mutualCount: number;
  doesNotFollowBackCount: number;
  youDontFollowBackCount: number;
}

/** Followers/following counts plus the three derived relationship-set sizes for one snapshot. */
export function buildAccountStats(followers: Relationship[], following: Relationship[]): AccountStats {
  const breakdown = computeCurrentRelationships(followers, following);
  return {
    followerCount: followers.length,
    followingCount: following.length,
    mutualCount: breakdown.mutuals.length,
    doesNotFollowBackCount: breakdown.doesNotFollowBack.length,
    youDontFollowBackCount: breakdown.youDontFollowBack.length,
  };
}

export interface AccountLookupResult {
  normalizedUsername: string;
  followsYou: boolean;
  youFollow: boolean;
  /** Unix seconds from the export, if Meta provided one for this relationship. Never fabricated. */
  followsYouSinceTimestamp: number | null;
  youFollowSinceTimestamp: number | null;
}

/** Looks up a single username's relationship status against both sets. Never guesses at accounts absent from both. */
export function lookupAccount(
  followers: Relationship[],
  following: Relationship[],
  rawUsername: string
): AccountLookupResult {
  const normalized = rawUsername.trim().replace(/^@+/, "").toLowerCase();
  const followerRecord = followers.find((r) => r.normalizedUsername === normalized);
  const followingRecord = following.find((r) => r.normalizedUsername === normalized);
  return {
    normalizedUsername: normalized,
    followsYou: !!followerRecord,
    youFollow: !!followingRecord,
    followsYouSinceTimestamp: followerRecord?.timestamp ?? null,
    youFollowSinceTimestamp: followingRecord?.timestamp ?? null,
  };
}
