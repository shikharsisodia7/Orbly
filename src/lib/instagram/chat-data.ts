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
  items: Array<{ username: string; profileUrl: string }>;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function toItem(rel: Relationship) {
  return { username: rel.displayUsername, profileUrl: rel.profileUrl };
}

/** Filters by a case-insensitive substring match on the username, then paginates. */
export function searchAndPaginate(
  list: Relationship[],
  options: { query?: string; offset?: number; limit?: number } = {}
): PaginatedResult {
  const { query, offset = 0, limit = DEFAULT_LIMIT } = options;
  const boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  const filtered = query
    ? list.filter((r) => r.normalizedUsername.includes(query.trim().toLowerCase().replace(/^@+/, "")))
    : list;

  const sorted = [...filtered].sort((a, b) => a.normalizedUsername.localeCompare(b.normalizedUsername));
  const page = sorted.slice(offset, offset + boundedLimit);

  return {
    total: filtered.length,
    items: page.map(toItem),
    hasMore: offset + boundedLimit < filtered.length,
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
}

/** Looks up a single username's relationship status against both sets. Never guesses at accounts absent from both. */
export function lookupAccount(
  followers: Relationship[],
  following: Relationship[],
  rawUsername: string
): AccountLookupResult {
  const normalized = rawUsername.trim().replace(/^@+/, "").toLowerCase();
  const followerSet = new Set(followers.map((r) => r.normalizedUsername));
  const followingSet = new Set(following.map((r) => r.normalizedUsername));
  return {
    normalizedUsername: normalized,
    followsYou: followerSet.has(normalized),
    youFollow: followingSet.has(normalized),
  };
}
