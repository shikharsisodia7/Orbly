import { beforeEach, describe, expect, it } from "vitest";
import { createSnapshot, deleteAllData, markAccountUnfollowed } from "@/lib/db/queries";
import { exportListAsCSV, getAccountStats, listDoesNotFollowBack, listMutuals } from "./chat-tools";
import type { Relationship } from "./types";

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

beforeEach(async () => {
  await deleteAllData();
});

describe("listDoesNotFollowBack — resolved-queue exclusion", () => {
  it("excludes an account once it's been marked unfollowed, without needing a re-import", async () => {
    await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice"), rel("bob"), rel("charlie")],
      datasetHash: "hash-1",
      originalFileName: null,
    });

    const before = await listDoesNotFollowBack({});
    if (!before.available) throw new Error("expected data to be available");
    expect(before.result.total).toBe(2);
    expect(before.result.items.map((i) => i.username).sort()).toEqual(["bob", "charlie"]);

    await markAccountUnfollowed({
      normalizedUsername: "bob",
      displayUsername: "bob",
      profileUrl: "https://www.instagram.com/bob/",
    });

    const after = await listDoesNotFollowBack({});
    if (!after.available) throw new Error("expected data to be available");
    expect(after.result.total).toBe(1);
    expect(after.result.items.map((i) => i.username)).toEqual(["charlie"]);
  });

  it("does not affect the mutuals list, which has no concept of being resolved", async () => {
    await createSnapshot({
      followers: [rel("alice"), rel("dave")],
      following: [rel("alice"), rel("dave"), rel("bob")],
      datasetHash: "hash-2",
      originalFileName: null,
    });
    await markAccountUnfollowed({
      normalizedUsername: "alice",
      displayUsername: "alice",
      profileUrl: "https://www.instagram.com/alice/",
    });

    const mutuals = await listMutuals({});
    if (!mutuals.available) throw new Error("expected data to be available");
    // "alice" is a genuine mutual and marking her unfollowed in the queue
    // (a does-not-follow-back concept) must not remove her from here.
    expect(mutuals.result.items.map((i) => i.username).sort()).toEqual(["alice", "dave"]);
  });
});

describe("getAccountStats — resolved-queue exclusion", () => {
  it("subtracts resolved accounts from the outstanding doesNotFollowBackCount", async () => {
    await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice"), rel("bob"), rel("charlie")],
      datasetHash: "hash-3",
      originalFileName: null,
    });

    const before = await getAccountStats();
    if (!before.available) throw new Error("expected data to be available");
    expect(before.doesNotFollowBackCount).toBe(2);

    await markAccountUnfollowed({
      normalizedUsername: "bob",
      displayUsername: "bob",
      profileUrl: "https://www.instagram.com/bob/",
    });

    const after = await getAccountStats();
    if (!after.available) throw new Error("expected data to be available");
    expect(after.doesNotFollowBackCount).toBe(1);
    // The raw follower/following counts themselves are facts about the
    // snapshot and must never change just because the queue changed.
    expect(after.followerCount).toBe(1);
    expect(after.followingCount).toBe(3);
  });
});

describe("exportListAsCSV", () => {
  it("reports unavailable when no snapshot has been imported", async () => {
    const result = await exportListAsCSV({ listType: "mutuals" });
    expect(result.available).toBe(false);
  });

  it("exports mutuals as a CSV with a blank detected_at column", async () => {
    await createSnapshot({
      followers: [rel("alice"), rel("dave")],
      following: [rel("alice"), rel("dave"), rel("bob")],
      datasetHash: "hash-csv-1",
      originalFileName: null,
    });

    const result = await exportListAsCSV({ listType: "mutuals" });
    if (!result.available) throw new Error("expected data to be available");
    expect(result.rowCount).toBe(2);
    expect(result.csv.split("\n")[0]).toBe("username,profile_url,detected_at");
    expect(result.csv).toContain("alice,https://www.instagram.com/alice/,");
    expect(result.filename).toMatch(/^orbly-mutuals-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it("excludes resolved (marked-unfollowed) accounts from a notFollowingBack export, same as the chat list", async () => {
    await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice"), rel("bob"), rel("charlie")],
      datasetHash: "hash-csv-2",
      originalFileName: null,
    });
    await markAccountUnfollowed({
      normalizedUsername: "bob",
      displayUsername: "bob",
      profileUrl: "https://www.instagram.com/bob/",
    });

    const result = await exportListAsCSV({ listType: "notFollowingBack" });
    if (!result.available) throw new Error("expected data to be available");
    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain("charlie");
    expect(result.csv).not.toContain("bob");
  });

  it("uses the snapshot-pair range (not a single date) as detected_at for lostFollowers/newFollowers", async () => {
    await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "hash-csv-3a",
      originalFileName: null,
    });
    await new Promise((r) => setTimeout(r, 5));
    await createSnapshot({
      followers: [rel("alice"), rel("charlie")],
      following: [rel("alice")],
      datasetHash: "hash-csv-3b",
      originalFileName: null,
    });

    const lost = await exportListAsCSV({ listType: "lostFollowers" });
    if (!lost.available) throw new Error("expected data to be available");
    expect(lost.rowCount).toBe(1);
    const lostRow = lost.csv.split("\n")[1];
    expect(lostRow.startsWith("bob,https://www.instagram.com/bob/,")).toBe(true);
    expect(lostRow).toMatch(/,.+ to .+$/);

    const gained = await exportListAsCSV({ listType: "newFollowers" });
    if (!gained.available) throw new Error("expected data to be available");
    expect(gained.rowCount).toBe(1);
    expect(gained.csv).toContain("charlie");
  });

  it("reports unavailable for lostFollowers/newFollowers with fewer than two usable snapshots", async () => {
    await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice")],
      datasetHash: "hash-csv-4",
      originalFileName: null,
    });

    const result = await exportListAsCSV({ listType: "lostFollowers" });
    expect(result.available).toBe(false);
  });
});
