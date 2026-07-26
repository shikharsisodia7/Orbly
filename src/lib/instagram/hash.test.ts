import { describe, expect, it } from "vitest";
import { canonicalDatasetString, hashDataset } from "./hash";
import type { Relationship } from "./types";

function rel(username: string): Relationship {
  return {
    normalizedUsername: username,
    displayUsername: username,
    profileUrl: `https://www.instagram.com/${username}/`,
    timestamp: null,
  };
}

describe("canonicalDatasetString", () => {
  it("sorts usernames deterministically regardless of input order", () => {
    const a = canonicalDatasetString([rel("bob"), rel("alice")], [rel("zed")]);
    const b = canonicalDatasetString([rel("alice"), rel("bob")], [rel("zed")]);
    expect(a).toBe(b);
  });
});

describe("hashDataset", () => {
  it("produces the same hash for the same relationship state regardless of order", async () => {
    const hashA = await hashDataset([rel("bob"), rel("alice")], [rel("charlie")]);
    const hashB = await hashDataset([rel("alice"), rel("bob")], [rel("charlie")]);
    expect(hashA).toBe(hashB);
  });

  it("produces a different hash when the dataset changes", async () => {
    const hashA = await hashDataset([rel("alice")], [rel("bob")]);
    const hashB = await hashDataset([rel("alice"), rel("charlie")], [rel("bob")]);
    expect(hashA).not.toBe(hashB);
  });

  it("is insensitive to display casing (only normalized usernames matter)", async () => {
    const hashA = await hashDataset(
      [{ ...rel("alice"), displayUsername: "Alice" }],
      [rel("bob")]
    );
    const hashB = await hashDataset(
      [{ ...rel("alice"), displayUsername: "ALICE" }],
      [rel("bob")]
    );
    expect(hashA).toBe(hashB);
  });

  it("returns a 64-character hex SHA-256 digest", async () => {
    const hash = await hashDataset([rel("alice")], [rel("bob")]);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
