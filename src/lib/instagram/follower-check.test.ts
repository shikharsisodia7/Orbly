import { describe, expect, it } from "vitest";
import { diffFollowerLists } from "./follower-check";
import type { Relationship } from "./types";

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

describe("diffFollowerLists", () => {
  it("identifies accounts present before but not now as unfollowed", () => {
    const previous = [rel("alice"), rel("bob"), rel("charlie")];
    const current = [rel("alice"), rel("charlie")];
    const { unfollowed, newFollowers } = diffFollowerLists(previous, current);
    expect(unfollowed.map((r) => r.normalizedUsername)).toEqual(["bob"]);
    expect(newFollowers).toEqual([]);
  });

  it("identifies accounts present now but not before as new followers", () => {
    const previous = [rel("alice")];
    const current = [rel("alice"), rel("dave")];
    const { unfollowed, newFollowers } = diffFollowerLists(previous, current);
    expect(unfollowed).toEqual([]);
    expect(newFollowers.map((r) => r.normalizedUsername)).toEqual(["dave"]);
  });

  it("identifies both unfollows and new follows in the same diff", () => {
    const previous = [rel("alice"), rel("bob")];
    const current = [rel("alice"), rel("charlie")];
    const { unfollowed, newFollowers } = diffFollowerLists(previous, current);
    expect(unfollowed.map((r) => r.normalizedUsername)).toEqual(["bob"]);
    expect(newFollowers.map((r) => r.normalizedUsername)).toEqual(["charlie"]);
  });

  it("returns empty diffs when nothing changed", () => {
    const list = [rel("alice"), rel("bob")];
    const { unfollowed, newFollowers } = diffFollowerLists(list, [...list]);
    expect(unfollowed).toEqual([]);
    expect(newFollowers).toEqual([]);
  });

  it("treats every previous follower as unfollowed when current is empty", () => {
    const previous = [rel("alice"), rel("bob")];
    const { unfollowed, newFollowers } = diffFollowerLists(previous, []);
    expect(unfollowed.map((r) => r.normalizedUsername).sort()).toEqual(["alice", "bob"]);
    expect(newFollowers).toEqual([]);
  });

  it("treats every current follower as new when previous is empty (first-ever check)", () => {
    const current = [rel("alice"), rel("bob")];
    const { unfollowed, newFollowers } = diffFollowerLists([], current);
    expect(unfollowed).toEqual([]);
    expect(newFollowers.map((r) => r.normalizedUsername).sort()).toEqual(["alice", "bob"]);
  });

  it("is not confused by order — matches purely on normalizedUsername", () => {
    const previous = [rel("charlie"), rel("alice"), rel("bob")];
    const current = [rel("bob"), rel("alice"), rel("charlie")];
    const { unfollowed, newFollowers } = diffFollowerLists(previous, current);
    expect(unfollowed).toEqual([]);
    expect(newFollowers).toEqual([]);
  });
});
