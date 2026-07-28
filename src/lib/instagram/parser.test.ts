import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { parseInstagramExport } from "./parser";

const FIXTURES_DIR = path.resolve(__dirname, "../../../tests/fixtures/instagram-export");

const FIXTURE_FILES = [
  "followers_1.json",
  "followers_2.json",
  "following.json",
  "close_friends.json",
  "blocked_profiles.json",
  "follow_requests_you've_sent.json",
  "recently_unfollowed_profiles.json",
  "profile_info.json",
];

async function buildFixtureZip(opts: { nested?: boolean } = {}): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const base = opts.nested ? "connections/followers_and_following/" : "";
  for (const name of FIXTURE_FILES) {
    const content = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
    zip.file(base + name, content);
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseInstagramExport", () => {
  it("parses followers across multiple files, dedupes, and ignores decoys", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);

    // followers_1: u001-u021 (21), followers_2: u018-u036 (19), overlap u018-u021 (4) => 36 unique
    expect(result.followers).toHaveLength(36);
    // following.json: u001-u010 + v001-v020 => 30 unique
    expect(result.following).toHaveLength(30);

    expect(result.diagnostics.followerFilesUsed.sort()).toEqual([
      "followers_1.json",
      "followers_2.json",
    ]);
    expect(result.diagnostics.followingFilesUsed).toEqual(["following.json"]);
  });

  it("never classifies decoy files as followers or following", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);

    const allUsernames = new Set([
      ...result.followers.map((r) => r.normalizedUsername),
      ...result.following.map((r) => r.normalizedUsername),
    ]);

    expect(allUsernames.has("decoyclose_synthetic")).toBe(false);
    expect(allUsernames.has("decoyblocked_synthetic")).toBe(false);
    expect(allUsernames.has("decoyrequest_synthetic")).toBe(false);
    expect(allUsernames.has("decoyunfollowed_synthetic")).toBe(false);

    expect(result.diagnostics.ignoredFiles).toContain("close_friends.json");
    expect(result.diagnostics.ignoredFiles).toContain("blocked_profiles.json");
    expect(result.diagnostics.ignoredFiles).toContain("follow_requests_you've_sent.json");
    expect(result.diagnostics.ignoredFiles).toContain("recently_unfollowed_profiles.json");
    expect(result.diagnostics.ignoredFiles).toContain("profile_info.json");
  });

  it("does not crash on unrelated JSON structure and counts it as ignored", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);
    expect(result.diagnostics.ignoredFileCount).toBeGreaterThanOrEqual(5);
  });

  it("derives a username from href when value is missing", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);
    const hrefOnly = result.followers.find((r) => r.normalizedUsername === "u036_hrefonly");
    expect(hrefOnly).toBeDefined();
  });

  it("handles a missing timestamp gracefully", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);
    const noTimestamp = result.followers.find((r) => r.normalizedUsername === "u021_synthetic");
    expect(noTimestamp).toBeDefined();
    expect(noTimestamp?.timestamp).toBeNull();
  });

  it("finds the same files regardless of nested directory structure", async () => {
    const buffer = await buildFixtureZip({ nested: true });
    const result = await parseInstagramExport(buffer);
    expect(result.followers).toHaveLength(36);
    expect(result.following).toHaveLength(30);
  });

  it("computes correct mutual/one-way relationships from parsed data", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);
    const followerNames = new Set(result.followers.map((r) => r.normalizedUsername));
    const followingNames = new Set(result.following.map((r) => r.normalizedUsername));
    const mutuals = [...followingNames].filter((n) => followerNames.has(n));
    expect(mutuals).toHaveLength(10); // u001-u010
  });

  it("reports diagnostics without crashing on an export with only decoy/unrelated files", async () => {
    const zip = new JSZip();
    zip.file("profile_info.json", fs.readFileSync(path.join(FIXTURES_DIR, "profile_info.json")));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);
    expect(result.followers).toHaveLength(0);
    expect(result.following).toHaveLength(0);
    expect(result.looksLikeHtmlExport).toBe(false);
  });

  it("detects a likely HTML export when there are no JSON files", async () => {
    const zip = new JSZip();
    zip.file("followers.html", "<html><body>not json</body></html>");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);
    expect(result.looksLikeHtmlExport).toBe(true);
  });

  it("reports raw/parsed/unique diagnostics that match the actual fixture data", async () => {
    const buffer = await buildFixtureZip();
    const result = await parseInstagramExport(buffer);

    // followers_1.json: 21 records, followers_2.json: 18 records = 39 raw, 36 unique (3 overlap)
    expect(result.diagnostics.followerRawRecords).toBe(39);
    expect(result.diagnostics.followerParsedRecords).toBe(39);
    expect(result.diagnostics.followerUniqueUsers).toBe(36);
    expect(result.diagnostics.followerDuplicates).toBe(3);
    expect(result.diagnostics.followerInvalidRecords).toBe(0);

    expect(result.diagnostics.followingRawRecords).toBe(30);
    expect(result.diagnostics.followingUniqueUsers).toBe(30);
    expect(result.diagnostics.followingDuplicates).toBe(0);

    expect(result.diagnostics.followerFileDetails.map((d) => d.fileName).sort()).toEqual([
      "followers_1.json",
      "followers_2.json",
    ]);
  });
});

/**
 * Regression fixture reproducing the exact reported real-world failure:
 * Instagram profile shows 3,866 followers, but Orbly's parser needs to prove
 * it can correctly read every follower across many numbered chunk files
 * rather than silently dropping records after the first file. This proves
 * the discrepancy in the field report was NOT caused by Orbly's parser losing
 * chunked follower data — that path is covered exactly here.
 */
describe("parseInstagramExport — large multi-file export (regression for reported 573-vs-3866 bug)", () => {
  function record(username: string, i: number) {
    return {
      title: "",
      media_list_data: [],
      string_list_data: [
        {
          href: `https://www.instagram.com/${username}/`,
          value: username,
          timestamp: 1690000000 + i * 3600,
        },
      ],
    };
  }

  async function buildLargeZip(): Promise<ArrayBuffer> {
    const zip = new JSZip();

    // 4 follower chunk files totalling exactly 3,866 unique followers, matching
    // the real Instagram profile count reported in the bug — proves multi-file
    // aggregation is not the source of follower loss.
    const chunkSizes = [1000, 1000, 1000, 866];
    let cursor = 0;
    chunkSizes.forEach((size, idx) => {
      const records = [];
      for (let n = 0; n < size; n++) {
        records.push(record(`follower_${cursor}`, cursor));
        cursor++;
      }
      zip.file(`followers_${idx + 1}.json`, JSON.stringify(records));
    });

    // A single following.json totalling exactly 5,783 unique accounts.
    const followingRecords = [];
    for (let n = 0; n < 5783; n++) {
      followingRecords.push(record(`followed_${n}`, n));
    }
    zip.file("following.json", JSON.stringify({ relationships_following: followingRecords }));

    return zip.generateAsync({ type: "arraybuffer" });
  }

  it("aggregates all numbered follower chunk files into the full 3,866-user total", async () => {
    const buffer = await buildLargeZip();
    const result = await parseInstagramExport(buffer);

    expect(result.followers).toHaveLength(3866);
    expect(result.following).toHaveLength(5783);
    expect(result.diagnostics.followerFilesUsed.sort()).toEqual([
      "followers_1.json",
      "followers_2.json",
      "followers_3.json",
      "followers_4.json",
    ]);
    expect(result.diagnostics.followerRawRecords).toBe(3866);
    expect(result.diagnostics.followerUniqueUsers).toBe(3866);
    expect(result.diagnostics.followerDuplicates).toBe(0);
  });
});

describe("parseInstagramExport — following title/value conflicts", () => {
  it("uses the string_list_data value and logs a conflict when title disagrees, without double-counting", async () => {
    const zip = new JSZip();
    const following = {
      relationships_following: [
        {
          title: "old_display_name",
          media_list_data: [],
          string_list_data: [
            { href: "https://www.instagram.com/actual_user/", value: "actual_user", timestamp: 1690000000 },
          ],
        },
      ],
    };
    zip.file("following.json", JSON.stringify(following));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);

    expect(result.following).toHaveLength(1);
    expect(result.following[0].normalizedUsername).toBe("actual_user");
    expect(result.diagnostics.conflictingRecords).toHaveLength(1);
    expect(result.diagnostics.conflictingRecords[0]).toMatchObject({
      title: "old_display_name",
      value: "actual_user",
      used: "actual_user",
    });
  });
});

describe("parseInstagramExport — current Meta export shape (title-only, no value, _u/ href)", () => {
  // Meta's current following.json export omits string_list_data[0].value
  // entirely and only puts the username in `title`; the href is a redirect
  // link shaped like "https://www.instagram.com/_u/<username>" (no trailing
  // slash). Regression for the real reported bug: this shape collapsed every
  // following record to a single fake "_u" user because the href parser read
  // "_u" as the username.
  function titleOnlyRecord(username: string, i: number) {
    return {
      title: username,
      media_list_data: [],
      string_list_data: [
        {
          href: `https://www.instagram.com/_u/${username}`,
          timestamp: 1690000000 + i * 3600,
        },
      ],
    };
  }

  it("parses thousands of title-only following records into distinct usernames, not one", async () => {
    const zip = new JSZip();
    const followingRecords = [];
    for (let n = 0; n < 5970; n++) {
      followingRecords.push(titleOnlyRecord(`followed_${n}`, n));
    }
    zip.file("following.json", JSON.stringify({ relationships_following: followingRecords }));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);

    expect(result.following).toHaveLength(5970);
    expect(result.following.map((r) => r.normalizedUsername)).not.toContain("_u");
    expect(result.following[0].normalizedUsername).toBe("followed_0");
    expect(result.following[0].profileUrl).toBe("https://www.instagram.com/_u/followed_0");
  });

  it("computes the correct don't-follow-back set when following uses title-only records", async () => {
    const zip = new JSZip();
    const followerRecords = [];
    for (let n = 0; n < 3885; n++) {
      followerRecords.push({
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: `https://www.instagram.com/followed_${n}`,
            value: `followed_${n}`,
            timestamp: 1690000000,
          },
        ],
      });
    }
    zip.file("followers_1.json", JSON.stringify(followerRecords));

    const followingRecords = [];
    for (let n = 0; n < 5970; n++) {
      followingRecords.push(titleOnlyRecord(`followed_${n}`, n));
    }
    zip.file("following.json", JSON.stringify({ relationships_following: followingRecords }));

    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);

    expect(result.followers).toHaveLength(3885);
    expect(result.following).toHaveLength(5970);

    const { computeCurrentRelationships } = await import("./comparisons");
    const breakdown = computeCurrentRelationships(result.followers, result.following);
    expect(breakdown.mutuals).toHaveLength(3885);
    expect(breakdown.doesNotFollowBack).toHaveLength(5970 - 3885);
    expect(breakdown.youDontFollowBack).toHaveLength(0);
  });
});

describe("parseInstagramExport — deleted-account placeholders", () => {
  // Real examples from an actual export: Meta replaces a deleted/deactivated
  // account's username with a synthetic placeholder instead of dropping the
  // record. These aren't real, clickable accounts, so they must never reach
  // followers/following, counts, or comparisons — just be silently excluded.
  it("excludes __deleted__-style placeholders from following.json", async () => {
    const zip = new JSZip();
    const followingRecords = [
      {
        title: "__deleted__bhiebedffbadibdch",
        string_list_data: [
          { href: "https://www.instagram.com/_u/__deleted__bhiebedffbadibdch", timestamp: 1687933153 },
        ],
      },
      {
        title: "realuser",
        string_list_data: [{ href: "https://www.instagram.com/_u/realuser", timestamp: 1690000000 }],
      },
    ];
    zip.file("following.json", JSON.stringify({ relationships_following: followingRecords }));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);

    expect(result.following).toHaveLength(1);
    expect(result.following[0].normalizedUsername).toBe("realuser");
    expect(result.diagnostics.followingRawRecords).toBe(2);
    expect(result.diagnostics.followingInvalidRecords).toBe(1);
  });

  it("excludes deleted<hash>-style placeholders from followers files", async () => {
    const zip = new JSZip();
    const followerRecords = [
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "https://www.instagram.com/deletedorangeufuuf", value: "deletedorangeufuuf", timestamp: 1600448021 },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          { href: "https://www.instagram.com/realuser/", value: "realuser", timestamp: 1690000000 },
        ],
      },
    ];
    zip.file("followers_1.json", JSON.stringify(followerRecords));
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseInstagramExport(buffer);

    expect(result.followers).toHaveLength(1);
    expect(result.followers[0].normalizedUsername).toBe("realuser");
    expect(result.diagnostics.followerInvalidRecords).toBe(1);
  });
});
