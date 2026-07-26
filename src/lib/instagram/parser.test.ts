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
});
