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
