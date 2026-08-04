import { beforeEach, describe, expect, it } from "vitest";
import { extractRelationshipsFromJson } from "./record-extract";
import { extractRelationshipsFromHtml } from "./html-extract";
import {
  addManyToQueue,
  createSnapshot,
  deleteAllData,
  getQueueItems,
  protectAccount as dbProtectAccount,
  updateQueueItemStatus,
} from "@/lib/db/queries";
import {
  exportListAsCSV,
  getAccountStats,
  listDoesNotFollowBack,
  listMutuals,
  listRecentUnfollowers,
  listYouDontFollowBack,
} from "./chat-tools";
import type { Relationship } from "./types";

/**
 * End-to-end audit for issue #4: deleted/deactivated Instagram accounts must
 * never surface anywhere, no matter where in the pipeline they'd enter —
 * a follower record, a following record (in either JSON shape Meta uses), an
 * HTML-format record, or a record that only shows up in a snapshot
 * comparison. The actual filter lives once, at parse time
 * (normalize.ts's isPlausibleUsername), so a placeholder never becomes a
 * Relationship object in the first place — everything downstream
 * (comparisons.ts, chat-tools.ts) only ever sees already-clean data. These
 * tests exercise that full path rather than re-testing the regex in
 * isolation (see normalize.test.ts for that).
 */

beforeEach(async () => {
  await deleteAllData();
});

describe("deleted-account placeholders never survive parsing", () => {
  it("filters a followers.json-style record with the placeholder in `value`", () => {
    const json = [
      {
        title: "",
        string_list_data: [
          { href: "https://www.instagram.com/realfriend/", value: "realfriend", timestamp: 1000 },
        ],
      },
      {
        title: "",
        string_list_data: [
          {
            href: "https://www.instagram.com/deletedqxrz9f2/",
            value: "deletedqxrz9f2",
            timestamp: 1001,
          },
        ],
      },
    ];
    const { relationships, invalidRecords } = extractRelationshipsFromJson(json, "followers_1.json");
    expect(relationships.map((r) => r.normalizedUsername)).toEqual(["realfriend"]);
    expect(invalidRecords).toBe(1);
  });

  it("filters a following.json-style record with the placeholder in `title` only (no `value`)", () => {
    const json = {
      relationships_following: [
        {
          title: "realaccount",
          string_list_data: [{ href: "https://www.instagram.com/_u/realaccount", timestamp: 2000 }],
        },
        {
          title: "__deleted__b3ac91",
          string_list_data: [{ href: "https://www.instagram.com/_u/__deleted__b3ac91", timestamp: 2001 }],
        },
      ],
    };
    const { relationships, invalidRecords } = extractRelationshipsFromJson(json, "following.json");
    expect(relationships.map((r) => r.normalizedUsername)).toEqual(["realaccount"]);
    expect(invalidRecords).toBe(1);
  });

  it("filters a placeholder that only appears in the profile href, with no usable title/value", () => {
    const json = [
      {
        string_list_data: [{ href: "https://www.instagram.com/deleted881ff2ac/" }],
      },
    ];
    const { relationships } = extractRelationshipsFromJson(json, "followers_2.json");
    expect(relationships).toHaveLength(0);
  });

  it("filters a deleted placeholder in the legacy HTML export format", () => {
    const html = `
      <html><body><main>
      <div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder"><div class="_a6-p"><div><div><a target="_blank" href="https://www.instagram.com/goodfollower">goodfollower</a></div><div>Jul 25, 2026 1:28 pm</div></div></div></div>
      <div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder"><div class="_a6-p"><div><div><a target="_blank" href="https://www.instagram.com/__deleted__aa11bb">__deleted__aa11bb</a></div><div>Jul 24, 2026 6:23 am</div></div></div></div>
      </main></body></html>
    `;
    const { relationships, invalidRecords } = extractRelationshipsFromHtml(html);
    expect(relationships.map((r) => r.normalizedUsername)).toEqual(["goodfollower"]);
    expect(invalidRecords).toBe(1);
  });
});

describe("deleted-account placeholders never surface in any tool output", () => {
  it("stays invisible across follower position, following position, and a snapshot comparison", async () => {
    // Snapshot 1: a deleted account in the followers file, another deleted
    // account in the following file, alongside real accounts in every role.
    const followersJson1 = [
      { string_list_data: [{ href: "https://www.instagram.com/alice/", value: "alice", timestamp: 10 }] },
      { string_list_data: [{ href: "https://www.instagram.com/bob/", value: "bob", timestamp: 11 }] },
      {
        string_list_data: [
          { href: "https://www.instagram.com/deleted7f3a2c/", value: "deleted7f3a2c", timestamp: 12 },
        ],
      },
    ];
    const followingJson1 = {
      relationships_following: [
        { title: "alice", string_list_data: [{ href: "https://www.instagram.com/_u/alice", timestamp: 20 }] },
        { title: "charlie", string_list_data: [{ href: "https://www.instagram.com/_u/charlie", timestamp: 21 }] },
        {
          title: "__deleted__9c0e11",
          string_list_data: [{ href: "https://www.instagram.com/_u/__deleted__9c0e11", timestamp: 22 }],
        },
      ],
    };

    const followers1 = extractRelationshipsFromJson(followersJson1, "followers_1.json").relationships;
    const following1 = extractRelationshipsFromJson(followingJson1, "following.json").relationships;

    await createSnapshot({
      followers: followers1,
      following: following1,
      datasetHash: "deleted-audit-1",
      originalFileName: null,
    });

    // Snapshot 2, taken later: "bob" (a real account) has genuinely stopped
    // following, so this is what a real lost-follower event looks like — the
    // deleted placeholder was never a follower to begin with, so it can't be
    // one now either. A fresh deleted placeholder also shows up in this
    // export's following file, simulating a different account going deleted
    // between imports.
    await new Promise((r) => setTimeout(r, 5));
    const followersJson2 = [
      { string_list_data: [{ href: "https://www.instagram.com/alice/", value: "alice", timestamp: 10 }] },
    ];
    const followingJson2 = {
      relationships_following: [
        { title: "alice", string_list_data: [{ href: "https://www.instagram.com/_u/alice", timestamp: 20 }] },
        { title: "charlie", string_list_data: [{ href: "https://www.instagram.com/_u/charlie", timestamp: 21 }] },
        {
          title: "deletedaa22bb33",
          string_list_data: [{ href: "https://www.instagram.com/_u/deletedaa22bb33", timestamp: 30 }],
        },
      ],
    };
    const followers2 = extractRelationshipsFromJson(followersJson2, "followers_1.json").relationships;
    const following2 = extractRelationshipsFromJson(followingJson2, "following.json").relationships;

    await createSnapshot({
      followers: followers2,
      following: following2,
      datasetHash: "deleted-audit-2",
      originalFileName: null,
    });

    const forbidden = ["deleted7f3a2c", "__deleted__9c0e11", "deletedaa22bb33"];
    function assertClean(csvOrList: string) {
      for (const name of forbidden) {
        expect(csvOrList).not.toContain(name);
      }
    }

    const stats = await getAccountStats();
    if (!stats.available) throw new Error("expected data to be available");
    // 1 real follower (alice) remains; charlie is doesNotFollowBack, nobody
    // is youDontFollowBack — none of that arithmetic ever counted a deleted
    // placeholder.
    expect(stats.followerCount).toBe(1);
    expect(stats.followingCount).toBe(2);

    const doesNotFollowBack = await listDoesNotFollowBack({});
    if (!doesNotFollowBack.available) throw new Error("expected data to be available");
    assertClean(JSON.stringify(doesNotFollowBack.result.items));
    expect(doesNotFollowBack.result.items.map((i) => i.normalizedUsername)).toEqual(["charlie"]);

    const youDontFollowBack = await listYouDontFollowBack({});
    if (!youDontFollowBack.available) throw new Error("expected data to be available");
    assertClean(JSON.stringify(youDontFollowBack.result.items));

    const mutuals = await listMutuals({});
    if (!mutuals.available) throw new Error("expected data to be available");
    assertClean(JSON.stringify(mutuals.result.items));
    expect(mutuals.result.items.map((i) => i.normalizedUsername)).toEqual(["alice"]);

    const recentUnfollowers = await listRecentUnfollowers({});
    if (!recentUnfollowers.available) throw new Error("expected data to be available");
    assertClean(JSON.stringify(recentUnfollowers.events));
    // bob is the only real lost follower — the deleted placeholder from
    // snapshot 1 was never a follower, so it can't generate a false event.
    expect(recentUnfollowers.events.map((e) => e.username)).toEqual(["bob"]);

    for (const listType of ["nonMutualFollowers", "notFollowingBack", "mutuals"] as const) {
      const csv = await exportListAsCSV({ listType });
      if (!csv.available) throw new Error("expected data to be available");
      assertClean(csv.csv);
    }
  });
});

// --- Issue #5: combined regression across handled + protected + deleted, over three imports ---

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

function deletedPlaceholderRecord(placeholder: string) {
  return {
    string_list_data: [{ href: `https://www.instagram.com/${placeholder}/`, value: placeholder, timestamp: 1 }],
  };
}

describe("issue #5 — nothing handled, protected, or deleted ever resurfaces across three imports", () => {
  it("stays clean through two rounds of re-import after marking accounts handled/skipped/protected", async () => {
    const alwaysFollower = [rel("alice")];

    // Snapshot 1: alice follows back; bob, charlie, dave don't. A deleted
    // placeholder rides along in the following file too.
    const followers1 = [
      ...extractRelationshipsFromJson([{ string_list_data: [{ href: "https://www.instagram.com/alice/", value: "alice" }] }], "f1.json").relationships,
    ];
    const followingJson1 = [
      { string_list_data: [{ href: "https://www.instagram.com/alice/", value: "alice" }] },
      { string_list_data: [{ href: "https://www.instagram.com/bob/", value: "bob" }] },
      { string_list_data: [{ href: "https://www.instagram.com/charlie/", value: "charlie" }] },
      { string_list_data: [{ href: "https://www.instagram.com/dave/", value: "dave" }] },
      deletedPlaceholderRecord("deleted111aaa"),
    ];
    const following1 = extractRelationshipsFromJson(followingJson1, "following.json").relationships;

    await createSnapshot({
      followers: followers1,
      following: following1,
      datasetHash: "combined-1",
      originalFileName: null,
    });

    // The user works through the suggestions: bob marked done, charlie
    // skipped, dave explicitly protected with a label.
    await addManyToQueue([
      { normalizedUsername: "bob", displayUsername: "bob", profileUrl: "https://www.instagram.com/bob/", source: "does-not-follow-back" },
      { normalizedUsername: "charlie", displayUsername: "charlie", profileUrl: "https://www.instagram.com/charlie/", source: "does-not-follow-back" },
    ]);
    const queued = await getQueueItems();
    const bobItem = queued.find((i) => i.normalizedUsername === "bob")!;
    const charlieItem = queued.find((i) => i.normalizedUsername === "charlie")!;
    await updateQueueItemStatus(bobItem.id, "completed");
    await updateQueueItemStatus(charlieItem.id, "skipped");
    await dbProtectAccount({
      normalizedUsername: "dave",
      displayUsername: "dave",
      profileUrl: "https://www.instagram.com/dave/",
      label: "close friend",
    });

    const afterFirstImport = await listDoesNotFollowBack({});
    if (!afterFirstImport.available) throw new Error("expected data to be available");
    expect(afterFirstImport.result.items).toHaveLength(0);

    // Snapshot 2: bob/charlie/dave are still in the raw following export
    // (never actually unfollowed on Instagram), a new deleted placeholder
    // shows up, and a genuinely new non-follow-back account (erin) appears.
    await new Promise((r) => setTimeout(r, 5));
    const followingJson2 = [
      ...followingJson1,
      { string_list_data: [{ href: "https://www.instagram.com/erin/", value: "erin" }] },
      deletedPlaceholderRecord("deleted222bbb"),
    ];
    const following2 = extractRelationshipsFromJson(followingJson2, "following.json").relationships;
    await createSnapshot({
      followers: alwaysFollower,
      following: following2,
      datasetHash: "combined-2",
      originalFileName: null,
    });

    const afterSecondImport = await listDoesNotFollowBack({});
    if (!afterSecondImport.available) throw new Error("expected data to be available");
    expect(afterSecondImport.result.items.map((i) => i.normalizedUsername)).toEqual(["erin"]);

    // Snapshot 3: same story again, plus yet another new deleted placeholder
    // and another genuinely new account (frank).
    await new Promise((r) => setTimeout(r, 5));
    const followingJson3 = [
      ...followingJson2,
      { string_list_data: [{ href: "https://www.instagram.com/frank/", value: "frank" }] },
      deletedPlaceholderRecord("deleted333ccc"),
    ];
    const following3 = extractRelationshipsFromJson(followingJson3, "following.json").relationships;
    await createSnapshot({
      followers: alwaysFollower,
      following: following3,
      datasetHash: "combined-3",
      originalFileName: null,
    });

    const afterThirdImport = await listDoesNotFollowBack({});
    if (!afterThirdImport.available) throw new Error("expected data to be available");
    expect(afterThirdImport.result.items.map((i) => i.normalizedUsername).sort()).toEqual(["erin", "frank"]);

    // Not one of bob (handled), charlie (skipped), dave (protected), or any
    // deleted placeholder ever appears in the CSV export either.
    const csv = await exportListAsCSV({ listType: "notFollowingBack" });
    if (!csv.available) throw new Error("expected data to be available");
    for (const forbidden of ["bob", "charlie", "dave", "deleted111aaa", "deleted222bbb", "deleted333ccc"]) {
      expect(csv.csv).not.toContain(forbidden);
    }
    expect(csv.csv).toContain("erin");
    expect(csv.csv).toContain("frank");

    // Dave stays visible only when protected accounts are explicitly requested.
    const includingProtected = await exportListAsCSV({ listType: "notFollowingBack", includeProtected: true });
    if (!includingProtected.available) throw new Error("expected data to be available");
    expect(includingProtected.csv).toContain("dave");
  });
});
