import { describe, expect, it } from "vitest";
import { buildAccountStats, lookupAccount, searchAndPaginate } from "./chat-data";
import type { Relationship } from "./types";

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

describe("buildAccountStats", () => {
  it("computes all five counts from followers/following", () => {
    const followers = [rel("alice"), rel("bob"), rel("charlie")];
    const following = [rel("alice"), rel("charlie"), rel("david")];

    const stats = buildAccountStats(followers, following);

    expect(stats).toEqual({
      followerCount: 3,
      followingCount: 3,
      mutualCount: 2,
      doesNotFollowBackCount: 1,
      youDontFollowBackCount: 1,
    });
  });
});

describe("lookupAccount", () => {
  const followers = [rel("alice"), rel("bob")];
  const following = [rel("alice"), rel("charlie")];

  it("reports both directions for a mutual", () => {
    expect(lookupAccount(followers, following, "alice")).toEqual({
      normalizedUsername: "alice",
      followsYou: true,
      youFollow: true,
    });
  });

  it("reports a one-way follow-back gap", () => {
    expect(lookupAccount(followers, following, "charlie")).toEqual({
      normalizedUsername: "charlie",
      followsYou: false,
      youFollow: true,
    });
  });

  it("normalizes @-prefixed and mixed-case input", () => {
    expect(lookupAccount(followers, following, "@Bob")).toEqual({
      normalizedUsername: "bob",
      followsYou: true,
      youFollow: false,
    });
  });

  it("reports an account absent from both sets truthfully, without guessing", () => {
    expect(lookupAccount(followers, following, "nobody")).toEqual({
      normalizedUsername: "nobody",
      followsYou: false,
      youFollow: false,
    });
  });
});

describe("searchAndPaginate", () => {
  const list = Array.from({ length: 120 }, (_, i) => rel(`user_${String(i).padStart(3, "0")}`));

  it("paginates using the default limit", () => {
    const result = searchAndPaginate(list);
    expect(result.total).toBe(120);
    expect(result.items).toHaveLength(50);
    expect(result.hasMore).toBe(true);
  });

  it("respects offset and a custom limit", () => {
    const result = searchAndPaginate(list, { offset: 100, limit: 50 });
    expect(result.total).toBe(120);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(false);
  });

  it("filters by a substring query, case-insensitively on the query itself", () => {
    const result = searchAndPaginate([rel("alexriver"), rel("mayac"), rel("alex_backup")], {
      query: "ALEX",
    });
    expect(result.total).toBe(2);
    expect(result.items.map((i) => i.username).sort()).toEqual(["alex_backup", "alexriver"]);
  });

  it("caps the limit at MAX_LIMIT even if a larger value is requested", () => {
    const result = searchAndPaginate(list, { limit: 10000 });
    expect(result.items).toHaveLength(120);
    expect(result.hasMore).toBe(false);
  });

  it("returns an empty page for an unmatched query, not an error", () => {
    const result = searchAndPaginate(list, { query: "doesnotexist" });
    expect(result.total).toBe(0);
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  describe("after cursor", () => {
    it("returns the item immediately following the cursor", () => {
      const small = [rel("alice"), rel("bob"), rel("charlie"), rel("dave")];
      const result = searchAndPaginate(small, { after: "bob", limit: 1 });
      expect(result.items.map((i) => i.username)).toEqual(["charlie"]);
    });

    it("stays correct even after earlier items have been removed from the source list", () => {
      // Regression: this is exactly what happens once an account is marked
      // "unfollowed" and excluded from the list before pagination — a plain
      // numeric offset would drift and skip the next real item, but a
      // cursor anchored to actual content doesn't care what disappeared
      // ahead of it.
      const full = [rel("alice"), rel("bob"), rel("charlie"), rel("dave"), rel("erin")];
      const first = searchAndPaginate(full, { offset: 0, limit: 2 });
      expect(first.items.map((i) => i.username)).toEqual(["alice", "bob"]);

      // "alice" gets marked unfollowed and removed from the source before
      // the next fetch, exactly like the resolved-usernames filter does.
      const afterRemoval = full.filter((r) => r.normalizedUsername !== "alice");
      const cursor = first.items[first.items.length - 1].username; // "bob"
      const next = searchAndPaginate(afterRemoval, { after: cursor, limit: 1 });
      expect(next.items.map((i) => i.username)).toEqual(["charlie"]);
    });

    it("reports no more results once the cursor is past the end", () => {
      const small = [rel("alice"), rel("bob")];
      const result = searchAndPaginate(small, { after: "bob", limit: 1 });
      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });
  });
});
