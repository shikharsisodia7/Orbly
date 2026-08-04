import { beforeEach, describe, expect, it } from "vitest";
import { computeCurrentRelationships, computeSnapshotChanges } from "@/lib/instagram/comparisons";
import { createSnapshot, deleteAllData, getAllSnapshots } from "@/lib/db/queries";
import { listDoesNotFollowBack, listRecentUnfollowers } from "@/lib/instagram/chat-tools";
import type { Relationship } from "@/lib/instagram/types";

/**
 * End-to-end verification of the exact two-snapshot scenario used to spec
 * out Orbly's relationship engine: proves the pure comparison math AND the
 * full IndexedDB + chat-tool pipeline agree on the same distinctions —
 * "doesn't follow back" (current) vs "unfollowed" (detected between two
 * snapshots) are never conflated in either layer.
 *
 * Snapshot A: followers = [anna, ben, chris]   following = [anna, ben, dana]
 * Snapshot B: followers = [anna, chris, erin]  following = [anna, chris, dana]
 */

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

const names = (rels: Relationship[]) => rels.map((r) => r.normalizedUsername).sort();

const snapshotAFollowers = [rel("anna"), rel("ben"), rel("chris")];
const snapshotAFollowing = [rel("anna"), rel("ben"), rel("dana")];
const snapshotBFollowers = [rel("anna"), rel("chris"), rel("erin")];
const snapshotBFollowing = [rel("anna"), rel("chris"), rel("dana")];

describe("comparisons — anna/ben/chris/dana/erin scenario (pure math)", () => {
  it("computes snapshot A's current relationships", () => {
    const a = computeCurrentRelationships(snapshotAFollowers, snapshotAFollowing);
    expect(names(a.mutuals)).toEqual(["anna", "ben"]);
    expect(names(a.doesNotFollowBack)).toEqual(["dana"]);
    expect(names(a.youDontFollowBack)).toEqual(["chris"]);
  });

  it("computes snapshot B's current relationships", () => {
    const b = computeCurrentRelationships(snapshotBFollowers, snapshotBFollowing);
    expect(names(b.mutuals)).toEqual(["anna", "chris"]);
    expect(names(b.doesNotFollowBack)).toEqual(["dana"]);
    expect(names(b.youDontFollowBack)).toEqual(["erin"]);
  });

  it("computes the A-to-B transition distinctly from either snapshot's current breakdown", () => {
    const changes = computeSnapshotChanges(
      snapshotAFollowers,
      snapshotBFollowers,
      snapshotAFollowing,
      snapshotBFollowing
    );
    expect(names(changes.lostFollowers)).toEqual(["ben"]); // detected unfollower
    expect(names(changes.newFollowers)).toEqual(["erin"]);
    expect(names(changes.stoppedFollowing)).toEqual(["ben"]); // user unfollowed
    expect(names(changes.startedFollowing)).toEqual(["chris"]);

    // Chris is snapshot A's "you don't follow back" AND becomes someone the
    // user starts following in B — two different facts about the same
    // person that must never be merged into one label.
    expect(names(changes.startedFollowing)).not.toEqual(names(changes.lostFollowers));
  });
});

describe("full pipeline — same scenario through IndexedDB + chat tools", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("distinguishes 'does not follow back' from 'detected unfollower' end to end", async () => {
    await createSnapshot({
      followers: snapshotAFollowers,
      following: snapshotAFollowing,
      datasetHash: "scenario-a",
      originalFileName: "export_a.zip",
    });
    // Ensure snapshot B sorts strictly after A (createdAt is the ordering key).
    await new Promise((r) => setTimeout(r, 5));
    await createSnapshot({
      followers: snapshotBFollowers,
      following: snapshotBFollowing,
      datasetHash: "scenario-b",
      originalFileName: "export_b.zip",
    });

    const allSnapshots = await getAllSnapshots();
    expect(allSnapshots).toHaveLength(2);

    // "Who doesn't follow me back?" (current, latest snapshot = B) must return
    // dana only — never ben, who is a past unfollower, not a current non-follower.
    const doesNotFollowBack = await listDoesNotFollowBack({});
    if (!doesNotFollowBack.available) throw new Error("expected data to be available");
    expect(doesNotFollowBack.result.items.map((i) => i.username)).toEqual(["dana"]);

    // "Who unfollowed me?" must return ben, with the comparison window
    // between the two snapshots — and must NOT include dana or erin, who
    // were never a lost follower.
    const unfollowers = await listRecentUnfollowers({});
    if (!unfollowers.available) throw new Error("expected data to be available");
    expect(unfollowers.events.map((e) => e.username)).toEqual(["ben"]);
    expect(unfollowers.events[0].unfollowedBetween.from).toBeTruthy();
    expect(unfollowers.events[0].unfollowedBetween.to).toBeTruthy();
  });

  it("reimporting an identical snapshot produces zero new detected-unfollower events", async () => {
    await createSnapshot({
      followers: snapshotAFollowers,
      following: snapshotAFollowing,
      datasetHash: "scenario-dup-a",
      originalFileName: "export_a.zip",
    });
    await new Promise((r) => setTimeout(r, 5));
    // Re-importing the exact same relationship data (as a distinct snapshot
    // row, e.g. via "Import anyway") must show no lost followers at all.
    await createSnapshot({
      followers: snapshotAFollowers,
      following: snapshotAFollowing,
      datasetHash: "scenario-dup-a-again",
      originalFileName: "export_a.zip",
    });

    const unfollowers = await listRecentUnfollowers({});
    if (!unfollowers.available) throw new Error("expected data to be available");
    expect(unfollowers.events).toHaveLength(0);
  });

  it("the first snapshot alone never produces unfollower events", async () => {
    await createSnapshot({
      followers: snapshotAFollowers,
      following: snapshotAFollowing,
      datasetHash: "scenario-baseline-only",
      originalFileName: "export_a.zip",
    });

    const unfollowers = await listRecentUnfollowers({});
    if (!unfollowers.available) throw new Error("expected data to be available");
    expect(unfollowers.total).toBe(0);
    expect(unfollowers.note).toMatch(/only one snapshot/i);
  });
});
