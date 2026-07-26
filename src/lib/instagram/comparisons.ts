import type { Relationship } from "./types";

export type RelationshipMap = Map<string, Relationship>;

export function toMap(relationships: Relationship[]): RelationshipMap {
  const map = new Map<string, Relationship>();
  for (const rel of relationships) map.set(rel.normalizedUsername, rel);
  return map;
}

function subtract(a: RelationshipMap, b: RelationshipMap): Relationship[] {
  const result: Relationship[] = [];
  for (const [key, rel] of a) {
    if (!b.has(key)) result.push(rel);
  }
  return result;
}

function intersect(a: RelationshipMap, b: RelationshipMap): Relationship[] {
  const result: Relationship[] = [];
  for (const [key, rel] of a) {
    if (b.has(key)) result.push(rel);
  }
  return result;
}

export interface CurrentRelationshipBreakdown {
  /** F ∩ G */
  mutuals: Relationship[];
  /** G - F: people you follow who don't follow you back */
  doesNotFollowBack: Relationship[];
  /** F - G: people who follow you that you don't follow back */
  youDontFollowBack: Relationship[];
}

/**
 * F = followers, G = following.
 */
export function computeCurrentRelationships(
  followers: Relationship[],
  following: Relationship[]
): CurrentRelationshipBreakdown {
  const F = toMap(followers);
  const G = toMap(following);
  return {
    mutuals: intersect(F, G),
    doesNotFollowBack: subtract(G, F),
    youDontFollowBack: subtract(F, G),
  };
}

export interface SnapshotChanges {
  newFollowers: Relationship[];
  lostFollowers: Relationship[];
  startedFollowing: Relationship[];
  stoppedFollowing: Relationship[];
}

/**
 * Compares two points in time. A person only counts as a "lost follower"
 * if they were present in the previous followers set AND absent from the
 * current followers set — never inferred from any other signal.
 */
export function computeSnapshotChanges(
  previousFollowers: Relationship[],
  currentFollowers: Relationship[],
  previousFollowing: Relationship[],
  currentFollowing: Relationship[]
): SnapshotChanges {
  const prevF = toMap(previousFollowers);
  const currF = toMap(currentFollowers);
  const prevG = toMap(previousFollowing);
  const currG = toMap(currentFollowing);

  return {
    newFollowers: subtract(currF, prevF),
    lostFollowers: subtract(prevF, currF),
    startedFollowing: subtract(currG, prevG),
    stoppedFollowing: subtract(prevG, currG),
  };
}
