import { describe, expect, it } from "vitest";
import {
  createActionCooldown,
  ExtensionMessageValidationError,
  normalizeExtensionScrapedList,
  parseExtensionMessage,
  type RawScrapedAccount,
} from "./extension-sync";

describe("normalizeExtensionScrapedList", () => {
  it("normalizes plain username+href entries into Relationships", () => {
    const raw: RawScrapedAccount[] = [
      { username: "alice", href: "https://www.instagram.com/alice/" },
      { username: "Bob", href: "https://www.instagram.com/bob/" },
    ];
    const { relationships, skipped } = normalizeExtensionScrapedList(raw);
    expect(skipped).toBe(0);
    expect(relationships.map((r) => r.normalizedUsername).sort()).toEqual(["alice", "bob"]);
    expect(relationships.find((r) => r.normalizedUsername === "bob")?.displayUsername).toBe("Bob");
  });

  it("derives the username from an _u/-style redirect href, same as the file parser", () => {
    const raw: RawScrapedAccount[] = [{ username: "_u", href: "https://www.instagram.com/_u/realaccount" }];
    const { relationships } = normalizeExtensionScrapedList(raw);
    expect(relationships.map((r) => r.normalizedUsername)).toEqual(["realaccount"]);
  });

  it("filters out a deleted/deactivated placeholder scraped from the DOM, exactly like a file import would", () => {
    const raw: RawScrapedAccount[] = [
      { username: "realfriend", href: "https://www.instagram.com/realfriend/" },
      { username: "deleted881ff2ac", href: "https://www.instagram.com/deleted881ff2ac/" },
      { username: "__deleted__aa11bb", href: "https://www.instagram.com/__deleted__aa11bb/" },
    ];
    const { relationships, skipped } = normalizeExtensionScrapedList(raw);
    expect(relationships.map((r) => r.normalizedUsername)).toEqual(["realfriend"]);
    expect(skipped).toBe(2);
  });

  it("deduplicates repeated entries (e.g. from re-scrolling the same modal)", () => {
    const raw: RawScrapedAccount[] = [
      { username: "alice", href: "https://www.instagram.com/alice/" },
      { username: "alice", href: "https://www.instagram.com/alice/" },
    ];
    const { relationships, skipped } = normalizeExtensionScrapedList(raw);
    expect(relationships).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it("never fabricates a follow timestamp — Instagram's own UI never exposes one", () => {
    const raw: RawScrapedAccount[] = [{ username: "alice", href: "https://www.instagram.com/alice/" }];
    const { relationships } = normalizeExtensionScrapedList(raw);
    expect(relationships[0].timestamp).toBeNull();
  });

  it("handles an empty capture without error", () => {
    const { relationships, skipped } = normalizeExtensionScrapedList([]);
    expect(relationships).toEqual([]);
    expect(skipped).toBe(0);
  });
});

describe("parseExtensionMessage", () => {
  it("accepts a valid sync payload", () => {
    const payload = {
      type: "orbly-extension-sync",
      version: 1,
      capturedAt: new Date().toISOString(),
      followers: [{ username: "alice", href: "https://www.instagram.com/alice/" }],
      following: [{ username: "bob", href: "https://www.instagram.com/bob/" }],
      sourceUsername: "myaccount",
    };
    const parsed = parseExtensionMessage(payload);
    expect(parsed.type).toBe("orbly-extension-sync");
  });

  it("accepts a valid bio payload", () => {
    const payload = {
      type: "orbly-extension-bio",
      version: 1,
      username: "bob",
      bio: "Member of the S C U crew",
      capturedAt: new Date().toISOString(),
    };
    expect(parseExtensionMessage(payload).type).toBe("orbly-extension-bio");
  });

  it("accepts a valid status payload", () => {
    const payload = {
      type: "orbly-extension-status",
      version: 1,
      username: "bob",
      status: "not_found",
      capturedAt: new Date().toISOString(),
    };
    expect(parseExtensionMessage(payload).type).toBe("orbly-extension-status");
  });

  it("rejects a malformed payload rather than silently coercing it", () => {
    expect(() => parseExtensionMessage({ type: "orbly-extension-sync" })).toThrow(ExtensionMessageValidationError);
  });

  it("rejects a payload with an unrecognized type, e.g. from an unrelated page/script", () => {
    expect(() => parseExtensionMessage({ type: "something-else", foo: "bar" })).toThrow(
      ExtensionMessageValidationError
    );
  });

  it("rejects a status payload with an invalid status value", () => {
    expect(() =>
      parseExtensionMessage({
        type: "orbly-extension-status",
        version: 1,
        username: "bob",
        status: "banned", // not one of the three valid statuses
        capturedAt: new Date().toISOString(),
      })
    ).toThrow(ExtensionMessageValidationError);
  });
});

describe("createActionCooldown", () => {
  it("allows the first run immediately", () => {
    const cooldown = createActionCooldown(2000, () => 1000);
    expect(cooldown.canRun()).toBe(true);
  });

  it("blocks a second run within the cooldown window", () => {
    let time = 1000;
    const cooldown = createActionCooldown(2000, () => time);
    expect(cooldown.canRun()).toBe(true);
    cooldown.markRun();
    time = 1500; // only 500ms later, still within the 2000ms window
    expect(cooldown.canRun()).toBe(false);
  });

  it("allows another run once the cooldown window has elapsed", () => {
    let time = 1000;
    const cooldown = createActionCooldown(2000, () => time);
    cooldown.markRun();
    time = 3200; // 2200ms later, past the window
    expect(cooldown.canRun()).toBe(true);
  });

  it("does not start the cooldown until markRun is actually called", () => {
    let time = 1000;
    const cooldown = createActionCooldown(2000, () => time);
    expect(cooldown.canRun()).toBe(true);
    time = 1001;
    expect(cooldown.canRun()).toBe(true); // still true — nothing has run yet
  });
});
