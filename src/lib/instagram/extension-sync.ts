import { z } from "zod";
import { buildProfileUrl, isPlausibleUsername, normalizeUsername, usernameFromProfileUrl } from "./normalize";
import type { Relationship } from "./types";

/**
 * Pure, framework-agnostic logic for the browser-extension companion's
 * manual, on-demand sync. Nothing here touches chrome.* APIs, the DOM, or
 * IndexedDB — it only turns already-scraped plain data into the same
 * Relationship shape the file-import parser produces, and validates the
 * message contract between the extension's content scripts and the web
 * app's /app/extension-sync bridge page. Kept separate and pure so it's
 * unit-testable without a browser extension runtime.
 *
 * The extension only ever runs when the user actively opens it while
 * viewing their own Instagram followers/following list or a specific
 * profile — there is no background timer or autonomous request anywhere in
 * this module or the extension that calls it.
 */

// --- Turning a raw scraped list into real Relationships ---

/** One entry as read directly out of the DOM: the anchor text and its href, nothing more. */
export interface RawScrapedAccount {
  username: string;
  href: string;
}

export interface NormalizeResult {
  relationships: Relationship[];
  /** Entries dropped as unparseable, a deleted/deactivated placeholder, or a duplicate. */
  skipped: number;
}

/**
 * Mirrors exactly what the file-import parser does to a raw record
 * (normalize.ts's isPlausibleUsername/normalizeUsername), so an
 * extension-synced account is held to the same bar as one from a real
 * export — a deleted-placeholder username scraped by accident (Instagram's
 * own UI shows one for a since-deleted account still listed) is filtered
 * out here exactly like it is at import time, never smuggled in as if it
 * were a real, followable account.
 */
export function normalizeExtensionScrapedList(raw: RawScrapedAccount[]): NormalizeResult {
  const seen = new Map<string, Relationship>();
  let skipped = 0;

  for (const entry of raw) {
    const fromHref = entry.href ? usernameFromProfileUrl(entry.href) : null;
    const normalized = fromHref ?? normalizeUsername(entry.username ?? "");
    if (!isPlausibleUsername(normalized)) {
      skipped++;
      continue;
    }
    if (seen.has(normalized)) {
      skipped++;
      continue;
    }
    seen.set(normalized, {
      normalizedUsername: normalized,
      displayUsername: entry.username?.trim() || normalized,
      profileUrl: buildProfileUrl(normalized),
      timestamp: null, // Instagram's own UI never exposes a follow timestamp — never fabricated.
    });
  }

  return { relationships: Array.from(seen.values()), skipped };
}

// --- The message contract between the extension and the web app bridge ---

const rawScrapedAccountSchema = z.object({
  username: z.string(),
  href: z.string(),
});

/** A full followers+following capture, sent only when the user has explicitly clicked "Sync to Orbly" after capturing both lists themselves. */
export const extensionSyncPayloadSchema = z.object({
  type: z.literal("orbly-extension-sync"),
  version: z.literal(1),
  capturedAt: z.string(),
  followers: z.array(rawScrapedAccountSchema),
  following: z.array(rawScrapedAccountSchema),
  /** The Instagram account whose followers/following were captured, for a sanity label — never assumed to be the signed-in user. */
  sourceUsername: z.string().nullable(),
});
export type ExtensionSyncPayload = z.infer<typeof extensionSyncPayloadSchema>;

/** A single account's bio, captured while the user was viewing that exact profile themselves. */
export const extensionBioPayloadSchema = z.object({
  type: z.literal("orbly-extension-bio"),
  version: z.literal(1),
  username: z.string(),
  bio: z.string(),
  capturedAt: z.string(),
});
export type ExtensionBioPayload = z.infer<typeof extensionBioPayloadSchema>;

/** A single account's live status, checked while the user was viewing that exact profile themselves. */
export const extensionStatusPayloadSchema = z.object({
  type: z.literal("orbly-extension-status"),
  version: z.literal(1),
  username: z.string(),
  status: z.enum(["active", "private", "not_found"]),
  capturedAt: z.string(),
});
export type ExtensionStatusPayload = z.infer<typeof extensionStatusPayloadSchema>;

export const extensionMessageSchema = z.discriminatedUnion("type", [
  extensionSyncPayloadSchema,
  extensionBioPayloadSchema,
  extensionStatusPayloadSchema,
]);
export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;

export class ExtensionMessageValidationError extends Error {}

/** Validates and narrows an arbitrary postMessage payload into a known extension message, or throws — never trusts the shape blindly. */
export function parseExtensionMessage(raw: unknown): ExtensionMessage {
  const result = extensionMessageSchema.safeParse(raw);
  if (!result.success) {
    throw new ExtensionMessageValidationError("This doesn't look like a message the Orbly extension would send.");
  }
  return result.data;
}

// --- A small cooldown so a user mashing an action button can't accidentally fire off rapid repeated actions ---

/**
 * Not a rate limiter for automated background requests — there are none in
 * this extension. This exists purely to stop a user's own accidental rapid
 * double/triple-click on "Capture this list" or "Look up this account" from
 * firing the same manual DOM read or profile navigation several times in a
 * row. Clock is injectable so this is testable without real timers.
 */
export function createActionCooldown(minIntervalMs: number, now: () => number = Date.now) {
  let lastRunAt: number | null = null;
  return {
    /** True if enough time has passed since the last run (or this is the first run). Does not itself record a run. */
    canRun(): boolean {
      return lastRunAt === null || now() - lastRunAt >= minIntervalMs;
    },
    /** Records that an action ran now, starting the cooldown window. */
    markRun(): void {
      lastRunAt = now();
    },
  };
}
