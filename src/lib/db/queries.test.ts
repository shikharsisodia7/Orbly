import { beforeEach, describe, expect, it } from "vitest";
import {
  addManyToQueue,
  createSnapshot,
  deleteAllData,
  deleteSnapshot,
  findSnapshotByDatasetHash,
  getAllSnapshots,
  getQueueItems,
  getSettings,
  getSnapshotFollowers,
  getSnapshotFollowing,
  markAccountUnfollowed,
  reconcileQueueWithFollowing,
  updateQueueItemStatus,
  updateSettings,
} from "./queries";
import type { Relationship } from "@/lib/instagram/types";

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

describe("createSnapshot", () => {
  it("persists a snapshot with its follower/following rows", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "hash-1",
      originalFileName: "export.zip",
    });

    expect(snapshot.followersCount).toBe(2);
    expect(snapshot.followingCount).toBe(1);

    const followers = await getSnapshotFollowers(snapshot.id);
    const following = await getSnapshotFollowing(snapshot.id);
    expect(followers).toHaveLength(2);
    expect(following).toHaveLength(1);
  });

  it("marks a snapshot unverified by default when there's no coverage or profile check", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "hash-unverified",
      originalFileName: "export.zip",
    });
    expect(snapshot.validity).toBe("unverified");
    expect(snapshot.dateRangeSource).toBe("unknown");
    expect(snapshot.parserVersion).toBeGreaterThanOrEqual(2);
  });

  it("marks a snapshot partial when Meta's own coverage header shows a limited window — the reported bug", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice")],
      following: [rel("alice"), rel("bob")],
      datasetHash: "hash-partial",
      originalFileName: "export.zip",
      coverage: {
        fromIso: "2025-07-25T00:00:00.000Z",
        toIso: "2026-07-25T00:00:00.000Z",
        spanDays: 365,
        looksLimited: true,
        source: "meta-explicit",
      },
    });
    expect(snapshot.validity).toBe("partial");
    expect(snapshot.validityReasons).toContain("DATE_RANGE_NOT_ALL_TIME");
    expect(snapshot.dateRangeSource).toBe("meta-explicit");
  });

  it("marks a snapshot complete when a manually-entered profile count matches", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice"), rel("bob")],
      following: [rel("alice")],
      datasetHash: "hash-complete",
      originalFileName: "export.zip",
      profileReference: { followers: 2, following: 1, recordedAt: new Date().toISOString() },
    });
    expect(snapshot.validity).toBe("complete");
    expect(snapshot.profileReferenceCounts?.followers).toBe(2);
  });

  it("can be found again by its dataset hash", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice")],
      following: [],
      datasetHash: "unique-hash",
      originalFileName: null,
    });
    const found = await findSnapshotByDatasetHash("unique-hash");
    expect(found?.id).toBe(snapshot.id);
    expect(await findSnapshotByDatasetHash("nonexistent")).toBeUndefined();
  });

  it("orders snapshots newest first", async () => {
    const first = await createSnapshot({
      followers: [],
      following: [],
      datasetHash: "h1",
      originalFileName: null,
    });
    await new Promise((r) => setTimeout(r, 5));
    const second = await createSnapshot({
      followers: [],
      following: [],
      datasetHash: "h2",
      originalFileName: null,
    });
    const all = await getAllSnapshots();
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
  });
});

describe("deleteSnapshot", () => {
  it("cascades to remove follower/following rows", async () => {
    const snapshot = await createSnapshot({
      followers: [rel("alice")],
      following: [rel("bob")],
      datasetHash: "h",
      originalFileName: null,
    });
    await deleteSnapshot(snapshot.id);
    expect(await getSnapshotFollowers(snapshot.id)).toHaveLength(0);
    expect(await getSnapshotFollowing(snapshot.id)).toHaveLength(0);
    expect(await getAllSnapshots()).toHaveLength(0);
  });
});

describe("queue", () => {
  it("adds items and skips duplicates already queued", async () => {
    const added = await addManyToQueue([
      {
        normalizedUsername: "alice",
        displayUsername: "alice",
        profileUrl: "https://www.instagram.com/alice/",
        source: "does-not-follow-back",
      },
    ]);
    expect(added).toBe(1);

    const addedAgain = await addManyToQueue([
      {
        normalizedUsername: "alice",
        displayUsername: "alice",
        profileUrl: "https://www.instagram.com/alice/",
        source: "manual",
      },
    ]);
    expect(addedAgain).toBe(0);

    const items = await getQueueItems();
    expect(items).toHaveLength(1);
  });

  it("filters by status", async () => {
    await addManyToQueue([
      {
        normalizedUsername: "alice",
        displayUsername: "alice",
        profileUrl: "https://www.instagram.com/alice/",
        source: "manual",
      },
    ]);
    const [item] = await getQueueItems();
    await updateQueueItemStatus(item.id, "completed");
    expect(await getQueueItems("completed")).toHaveLength(1);
    expect(await getQueueItems("pending")).toHaveLength(0);
  });
});

describe("markAccountUnfollowed", () => {
  it("inserts a new queue entry as completed, not pending", async () => {
    await markAccountUnfollowed({
      normalizedUsername: "alice",
      displayUsername: "Alice",
      profileUrl: "https://www.instagram.com/alice/",
    });
    const items = await getQueueItems();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      normalizedUsername: "alice",
      status: "completed",
      source: "does-not-follow-back",
    });
  });

  it("flips an existing pending entry to completed instead of duplicating it", async () => {
    await addManyToQueue([
      {
        normalizedUsername: "alice",
        displayUsername: "alice",
        profileUrl: "https://www.instagram.com/alice/",
        source: "manual",
      },
    ]);
    await markAccountUnfollowed({
      normalizedUsername: "alice",
      displayUsername: "alice",
      profileUrl: "https://www.instagram.com/alice/",
    });
    const items = await getQueueItems();
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("completed");
  });
});

describe("reconcileQueueWithFollowing", () => {
  async function queueTwo() {
    await addManyToQueue([
      {
        normalizedUsername: "alice",
        displayUsername: "alice",
        profileUrl: "https://www.instagram.com/alice/",
        source: "does-not-follow-back",
      },
      {
        normalizedUsername: "bob",
        displayUsername: "bob",
        profileUrl: "https://www.instagram.com/bob/",
        source: "does-not-follow-back",
      },
    ]);
  }

  it("closes out pending items no longer present in the following list", async () => {
    await queueTwo();
    // The new export still follows alice, but bob is gone (unfollowed or deleted).
    const resolved = await reconcileQueueWithFollowing([rel("alice")]);
    expect(resolved).toBe(1);

    const pending = await getQueueItems("pending");
    expect(pending.map((i) => i.normalizedUsername)).toEqual(["alice"]);

    const completed = await getQueueItems("completed");
    expect(completed.map((i) => i.normalizedUsername)).toEqual(["bob"]);
  });

  it("leaves everything pending when the whole queue is still followed", async () => {
    await queueTwo();
    const resolved = await reconcileQueueWithFollowing([rel("alice"), rel("bob")]);
    expect(resolved).toBe(0);
    expect(await getQueueItems("pending")).toHaveLength(2);
  });

  it("does not reopen or disturb items the user already skipped", async () => {
    await queueTwo();
    const [first] = await getQueueItems();
    await updateQueueItemStatus(first.id, "skipped");

    await reconcileQueueWithFollowing([]);

    const skipped = await getQueueItems("skipped");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].id).toBe(first.id);
  });
});

describe("settings", () => {
  it("returns defaults when unset", async () => {
    const settings = await getSettings();
    expect(settings.onboardingCompleted).toBe(false);
  });

  it("persists updates", async () => {
    await updateSettings({ onboardingCompleted: true });
    const settings = await getSettings();
    expect(settings.onboardingCompleted).toBe(true);
  });
});
