import { describe, expect, it } from "vitest";
import { buildAccountStats, buildCSVFilename, buildRelationshipCSV, lookupAccount, searchAndPaginate } from "./chat-data";
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
      followsYouSinceTimestamp: null,
      youFollowSinceTimestamp: null,
    });
  });

  it("reports a one-way follow-back gap", () => {
    expect(lookupAccount(followers, following, "charlie")).toEqual({
      normalizedUsername: "charlie",
      followsYou: false,
      youFollow: true,
      followsYouSinceTimestamp: null,
      youFollowSinceTimestamp: null,
    });
  });

  it("normalizes @-prefixed and mixed-case input", () => {
    expect(lookupAccount(followers, following, "@Bob")).toEqual({
      normalizedUsername: "bob",
      followsYou: true,
      youFollow: false,
      followsYouSinceTimestamp: null,
      youFollowSinceTimestamp: null,
    });
  });

  it("reports an account absent from both sets truthfully, without guessing", () => {
    expect(lookupAccount(followers, following, "nobody")).toEqual({
      normalizedUsername: "nobody",
      followsYou: false,
      youFollow: false,
      followsYouSinceTimestamp: null,
      youFollowSinceTimestamp: null,
    });
  });

  it("surfaces each direction's real timestamp from the export, independently", () => {
    const timedFollowers: Relationship[] = [{ ...rel("dana"), timestamp: 1700000000 }];
    const timedFollowing: Relationship[] = [{ ...rel("dana"), timestamp: 1750000000 }];
    const result = lookupAccount(timedFollowers, timedFollowing, "dana");
    expect(result.followsYouSinceTimestamp).toBe(1700000000);
    expect(result.youFollowSinceTimestamp).toBe(1750000000);
  });

  it("never fabricates a timestamp for a relationship the export didn't provide one for", () => {
    const result = lookupAccount(followers, following, "alice");
    expect(result.followsYouSinceTimestamp).toBeNull();
    expect(result.youFollowSinceTimestamp).toBeNull();
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

describe("buildRelationshipCSV", () => {
  it("builds a header plus one row per relationship, with a blank detected_at by default", () => {
    const csv = buildRelationshipCSV([rel("alice"), rel("bob")]);
    expect(csv).toBe(
      [
        "username,profile_url,detected_at",
        "alice,https://www.instagram.com/alice/,",
        "bob,https://www.instagram.com/bob/,",
      ].join("\n")
    );
  });

  it("applies the same detected_at value to every row when given a snapshot-pair range", () => {
    const csv = buildRelationshipCSV([rel("alice")], "2026-05-01T00:00:00.000Z to 2026-06-01T00:00:00.000Z");
    expect(csv).toBe(
      "username,profile_url,detected_at\nalice,https://www.instagram.com/alice/,2026-05-01T00:00:00.000Z to 2026-06-01T00:00:00.000Z"
    );
  });

  it("returns just the header for an empty list", () => {
    expect(buildRelationshipCSV([])).toBe("username,profile_url,detected_at");
  });

  it("quotes and escapes fields containing commas, quotes, or newlines", () => {
    const weird: Relationship = {
      normalizedUsername: "weird",
      displayUsername: 'weird, "name"',
      profileUrl: "https://www.instagram.com/weird/",
      timestamp: null,
    };
    const csv = buildRelationshipCSV([weird]);
    const [, row] = csv.split("\n");
    expect(row).toBe('"weird, ""name""",https://www.instagram.com/weird/,');
  });
});

describe("buildCSVFilename", () => {
  it("slugifies the list type and truncates the date to just the day", () => {
    expect(buildCSVFilename("nonMutualFollowers", "2026-06-15T08:30:00.000Z")).toBe(
      "orbly-non-mutual-followers-2026-06-15.csv"
    );
    expect(buildCSVFilename("lostFollowers", "2026-01-02T00:00:00.000Z")).toBe(
      "orbly-lost-followers-2026-01-02.csv"
    );
  });
});
