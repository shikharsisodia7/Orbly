import { describe, expect, it } from "vitest";
import {
  buildProfileUrl,
  isPlausibleUsername,
  normalizeUsername,
  usernameFromProfileUrl,
} from "./normalize";

describe("normalizeUsername", () => {
  it("lowercases", () => {
    expect(normalizeUsername("@JohnSmith")).toBe("johnsmith");
  });

  it("strips a leading @", () => {
    expect(normalizeUsername("@alex")).toBe("alex");
  });

  it("trims whitespace", () => {
    expect(normalizeUsername(" alex ")).toBe("alex");
  });

  it("combines all rules", () => {
    expect(normalizeUsername(" @JohnSmith ")).toBe("johnsmith");
  });

  it("handles usernames with periods and underscores", () => {
    expect(normalizeUsername("@Jane.Doe_92")).toBe("jane.doe_92");
  });
});

describe("isPlausibleUsername", () => {
  it("accepts standard usernames", () => {
    expect(isPlausibleUsername("johnsmith")).toBe(true);
    expect(isPlausibleUsername("jane.doe_92")).toBe(true);
  });

  it("rejects empty strings", () => {
    expect(isPlausibleUsername("")).toBe(false);
  });

  it("rejects usernames with spaces or invalid characters", () => {
    expect(isPlausibleUsername("john smith")).toBe(false);
    expect(isPlausibleUsername("john!smith")).toBe(false);
  });

  it("rejects usernames over 30 chars", () => {
    expect(isPlausibleUsername("a".repeat(31))).toBe(false);
  });

  it("rejects strings that are only periods or underscores", () => {
    expect(isPlausibleUsername("...")).toBe(false);
    expect(isPlausibleUsername("___")).toBe(false);
  });

  it("rejects Meta's deleted-account placeholders, in both observed forms", () => {
    // Real examples from an actual Instagram export: following.json uses
    // "__deleted__<hash>", followers files use "deleted<hash>" — neither
    // is a real, clickable account.
    expect(isPlausibleUsername("__deleted__bhiebedffbadibdch")).toBe(false);
    expect(isPlausibleUsername("deletedorangeufuuf")).toBe(false);
  });
});

describe("usernameFromProfileUrl", () => {
  it("derives username from a standard profile URL", () => {
    expect(usernameFromProfileUrl("https://www.instagram.com/johnsmith/")).toBe("johnsmith");
  });

  it("derives username without trailing slash", () => {
    expect(usernameFromProfileUrl("https://instagram.com/johnsmith")).toBe("johnsmith");
  });

  it("returns null for unrelated URLs", () => {
    expect(usernameFromProfileUrl("https://example.com/johnsmith")).toBeNull();
  });

  it("returns null for implausible captured segments", () => {
    expect(usernameFromProfileUrl("https://instagram.com/")).toBeNull();
  });
});

describe("buildProfileUrl", () => {
  it("builds a canonical instagram URL", () => {
    expect(buildProfileUrl("johnsmith")).toBe("https://www.instagram.com/johnsmith/");
  });
});
