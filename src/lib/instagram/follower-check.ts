import type { Relationship } from "./types";

/**
 * Pure set-difference between two followers lists, keyed on normalized
 * username. Kept separate from check-now.ts's Dexie-backed orchestration
 * the same way chat-data.ts's logic is kept apart from chat-tools.ts — this
 * is unit-testable without touching IndexedDB, and it's the one place the
 * actual "who unfollowed / who's new" definition lives.
 *
 * Deliberately followers-only: "who unfollowed me" and "who newly followed
 * me" are both facts about the followers list alone — the following list
 * (who the user follows) has nothing to do with either question.
 */
export interface FollowerDiff {
  /** In `previous` but not `current` — stopped following. */
  unfollowed: Relationship[];
  /** In `current` but not `previous` — started following. */
  newFollowers: Relationship[];
}

export function diffFollowerLists(previous: Relationship[], current: Relationship[]): FollowerDiff {
  const currentSet = new Set(current.map((r) => r.normalizedUsername));
  const previousSet = new Set(previous.map((r) => r.normalizedUsername));

  return {
    unfollowed: previous.filter((r) => !currentSet.has(r.normalizedUsername)),
    newFollowers: current.filter((r) => !previousSet.has(r.normalizedUsername)),
  };
}
