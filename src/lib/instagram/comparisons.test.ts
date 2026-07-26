import { describe, expect, it } from "vitest";
import { computeCurrentRelationships, computeSnapshotChanges } from "./comparisons";
import type { Relationship } from "./types";

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

const names = (rels: Relationship[]) =>
  rels.map((r) => r.normalizedUsername).sort();

describe("computeCurrentRelationships", () => {
  it("computes mutuals, does-not-follow-back and you-dont-follow-back correctly", () => {
    const followers = [rel("alice"), rel("bob"), rel("charlie")];
    const following = [rel("alice"), rel("charlie"), rel("david")];

    const result = computeCurrentRelationships(followers, following);

    expect(names(result.mutuals)).toEqual(["alice", "charlie"]);
    expect(names(result.doesNotFollowBack)).toEqual(["david"]);
    expect(names(result.youDontFollowBack)).toEqual(["bob"]);
  });

  it("handles no overlap", () => {
    const followers = [rel("a")];
    const following = [rel("b")];
    const result = computeCurrentRelationships(followers, following);
    expect(result.mutuals).toHaveLength(0);
    expect(names(result.doesNotFollowBack)).toEqual(["b"]);
    expect(names(result.youDontFollowBack)).toEqual(["a"]);
  });

  it("handles empty inputs", () => {
    const result = computeCurrentRelationships([], []);
    expect(result.mutuals).toHaveLength(0);
    expect(result.doesNotFollowBack).toHaveLength(0);
    expect(result.youDontFollowBack).toHaveLength(0);
  });
});

describe("computeSnapshotChanges", () => {
  it("detects new and lost followers, started/stopped following", () => {
    const previousFollowers = [rel("alice"), rel("bob"), rel("charlie")];
    const currentFollowers = [rel("alice"), rel("charlie"), rel("david")];
    const previousFollowing = [rel("alice"), rel("bob")];
    const currentFollowing = [rel("alice"), rel("erin")];

    const result = computeSnapshotChanges(
      previousFollowers,
      currentFollowers,
      previousFollowing,
      currentFollowing
    );

    expect(names(result.lostFollowers)).toEqual(["bob"]);
    expect(names(result.newFollowers)).toEqual(["david"]);
    expect(names(result.stoppedFollowing)).toEqual(["bob"]);
    expect(names(result.startedFollowing)).toEqual(["erin"]);
  });

  it("does not report someone as a lost follower just because they currently don't follow back", () => {
    // "bob" follows in both snapshots (never left followers) — must not appear as lost.
    const previousFollowers = [rel("bob")];
    const currentFollowers = [rel("bob")];
    const previousFollowing = [rel("bob")];
    const currentFollowing: Relationship[] = [];

    const result = computeSnapshotChanges(
      previousFollowers,
      currentFollowers,
      previousFollowing,
      currentFollowing
    );

    expect(result.lostFollowers).toHaveLength(0);
    expect(names(result.stoppedFollowing)).toEqual(["bob"]);
  });

  it("returns no changes for identical snapshots", () => {
    const followers = [rel("alice")];
    const following = [rel("bob")];
    const result = computeSnapshotChanges(followers, followers, following, following);
    expect(result.newFollowers).toHaveLength(0);
    expect(result.lostFollowers).toHaveLength(0);
    expect(result.startedFollowing).toHaveLength(0);
    expect(result.stoppedFollowing).toHaveLength(0);
  });
});
