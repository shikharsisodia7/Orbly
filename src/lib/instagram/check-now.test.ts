import { beforeEach, describe, expect, it } from "vitest";
import {
  addExclusionRule as dbAddExclusionRule,
  createSnapshot,
  deleteAllData,
  getFollowerChecks,
  getLatestSnapshot,
  protectAccount as dbProtectAccount,
  setAccountStatus,
  updateQueueItemStatus,
  addManyToQueue,
  getQueueItems,
} from "@/lib/db/queries";
import { runCheckNow } from "./check-now";
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

describe("runCheckNow — first check", () => {
  it("reports isFirstCheck with no unfollows and everyone as new when there's no prior data at all", async () => {
    const result = await runCheckNow([rel("alice"), rel("bob")], "extension");
    expect(result.isFirstCheck).toBe(true);
    expect(result.previousCheckedAt).toBeNull();
    expect(result.unfollowed).toEqual([]);
    expect(result.newFollowers.map((i) => i.username).sort()).toEqual(["alice", "bob"]);
  });

  it("persists the check so a history exists after just one check", async () => {
    await runCheckNow([rel("alice")], "extension");
    const history = await getFollowerChecks();
    expect(history).toHaveLength(1);
    expect(history[0].source).toBe("extension");
  });
});

describe("runCheckNow — extension-to-extension diff", () => {
  it("correctly identifies who unfollowed and who newly followed between two checks", async () => {
    await runCheckNow([rel("alice"), rel("bob"), rel("charlie")], "extension");
    await new Promise((r) => setTimeout(r, 5));

    const second = await runCheckNow([rel("alice"), rel("charlie"), rel("dave")], "extension");
    expect(second.isFirstCheck).toBe(false);
    expect(second.unfollowed.map((i) => i.username)).toEqual(["bob"]);
    expect(second.newFollowers.map((i) => i.username)).toEqual(["dave"]);
  });

  it("builds a short history across three consecutive checks, newest first", async () => {
    await runCheckNow([rel("alice"), rel("bob")], "extension");
    await new Promise((r) => setTimeout(r, 5));
    await runCheckNow([rel("alice")], "extension");
    await new Promise((r) => setTimeout(r, 5));
    await runCheckNow([rel("alice"), rel("charlie")], "extension");

    const history = await getFollowerChecks();
    expect(history).toHaveLength(3);
    expect(history[0].newFollowerCount).toBe(1); // charlie
    expect(history[1].unfollowedCount).toBe(1); // bob
  });
});

describe("runCheckNow — web-import case never compares a snapshot against itself", () => {
  it("compares the just-imported snapshot against the PREVIOUS snapshot, not against itself", async () => {
    await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "check-now-1",
      originalFileName: null,
    });
    await new Promise((r) => setTimeout(r, 5));
    await createSnapshot({
      followers: [rel("alice"), rel("charlie")],
      following: [rel("alice")],
      datasetHash: "check-now-2",
      originalFileName: null,
    });
    const latest = await getLatestSnapshot();
    if (!latest) throw new Error("expected a snapshot");

    const result = await runCheckNow([rel("alice"), rel("charlie")], "web-import", latest.id);
    expect(result.isFirstCheck).toBe(false);
    expect(result.unfollowed.map((i) => i.username)).toEqual(["bob"]);
    expect(result.newFollowers.map((i) => i.username)).toEqual(["charlie"]);
  });

  it("a web-import check reuses the snapshot's own followers instead of duplicating storage", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice")],
      datasetHash: "check-now-3",
      originalFileName: null,
    });
    await runCheckNow([rel("alice")], "web-import", snapshot.id);
    const history = await getFollowerChecks();
    expect(history[0].snapshotId).toBe(snapshot.id);
  });
});

describe("runCheckNow — baseline resolution across sources", () => {
  it("uses a prior extension check as the baseline for a later web-import check", async () => {
    await runCheckNow([rel("alice"), rel("bob")], "extension");
    await new Promise((r) => setTimeout(r, 5));

    const snapshot = await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice")],
      datasetHash: "check-now-4",
      originalFileName: null,
    });
    const result = await runCheckNow([rel("alice")], "web-import", snapshot.id);
    expect(result.unfollowed.map((i) => i.username)).toEqual(["bob"]);
  });

  it("uses a prior web-import snapshot as the baseline for a later extension check", async () => {
    await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "check-now-5",
      originalFileName: null,
    });
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed.map((i) => i.username)).toEqual(["bob"]);
  });
});

describe("runCheckNow — excluded accounts are omitted from unfollow results", () => {
  it("omits a protected account from unfollowed, but still counts it in excludedCount", async () => {
    await runCheckNow([rel("alice"), rel("bob")], "extension");
    await dbProtectAccount({ normalizedUsername: "bob", displayUsername: "bob", profileUrl: "https://www.instagram.com/bob/" });
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed).toEqual([]);
    expect(result.excludedCount).toBe(1);
  });

  it("omits an account matching a username exclusion rule from unfollowed", async () => {
    await runCheckNow([rel("alice"), rel("nba_fan")], "extension");
    await dbAddExclusionRule({ rawPattern: "nba", matchMode: "contains", field: "username" });
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed).toEqual([]);
    expect(result.excludedCount).toBe(1);
  });

  it("omits an account confirmed gone (not_found status) from unfollowed", async () => {
    await runCheckNow([rel("alice"), rel("bob")], "extension");
    await setAccountStatus("bob", "not_found");
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed).toEqual([]);
    expect(result.excludedCount).toBe(1);
  });

  it("omits an account already resolved in the unfollow queue from unfollowed", async () => {
    await runCheckNow([rel("alice"), rel("bob")], "extension");
    await addManyToQueue([{ normalizedUsername: "bob", displayUsername: "bob", profileUrl: "https://www.instagram.com/bob/", source: "recent-unfollower" }]);
    const items = await getQueueItems();
    await updateQueueItemStatus(items[0].id, "completed");
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed).toEqual([]);
    expect(result.excludedCount).toBe(1);
  });

  it("mixed: excludes only the matching accounts, leaves a genuine unfollow visible", async () => {
    await runCheckNow([rel("alice"), rel("bob"), rel("nba_fan"), rel("charlie")], "extension");
    await dbProtectAccount({ normalizedUsername: "bob", displayUsername: "bob", profileUrl: "https://www.instagram.com/bob/" });
    await dbAddExclusionRule({ rawPattern: "nba", matchMode: "contains", field: "username" });
    await new Promise((r) => setTimeout(r, 5));

    // alice stays, bob/nba_fan/charlie all unfollow — bob and nba_fan are
    // excluded, charlie is a genuine, visible unfollow.
    const result = await runCheckNow([rel("alice")], "extension");
    expect(result.unfollowed.map((i) => i.username)).toEqual(["charlie"]);
    expect(result.excludedCount).toBe(2);
  });

  it("does NOT filter newFollowers by exclusion rules — only the unfollow side is filtered", async () => {
    await runCheckNow([rel("alice")], "extension");
    await dbAddExclusionRule({ rawPattern: "nba", matchMode: "contains", field: "username" });
    await new Promise((r) => setTimeout(r, 5));

    const result = await runCheckNow([rel("alice"), rel("nba_fan")], "extension");
    expect(result.newFollowers.map((i) => i.username)).toEqual(["nba_fan"]);
  });
});
