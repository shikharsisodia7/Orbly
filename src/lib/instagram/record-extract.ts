import { buildProfileUrl, isPlausibleUsername, normalizeUsername, usernameFromProfileUrl } from "./normalize";
import type { ConflictingRecord, Relationship } from "./types";

/**
 * Schema-aware JSON extraction for Instagram follower/following exports.
 *
 * Every Meta relationship record is ONE JSON object representing ONE account.
 * This module enforces that invariant end to end: exactly one relationship
 * comes out of each record, no matter how many candidate fields (title, href,
 * value) that record happens to carry.
 */

interface RawStringListEntry {
  href?: unknown;
  value?: unknown;
  timestamp?: unknown;
}

interface RawRecord {
  title?: unknown;
  string_list_data?: unknown;
}

function isRawRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null;
}

function isRawStringListEntry(value: unknown): value is RawStringListEntry {
  return typeof value === "object" && value !== null;
}

/**
 * Locates the array of relationship-record objects within an Instagram export
 * JSON document, trying known Meta shapes first:
 *   - followers_*.json: a plain top-level array of records
 *   - following.json:   { relationships_following: [...] }
 * Falls back to a bounded, schema-validated search for any array whose items
 * are all record-shaped (have a string_list_data array), so a future Meta
 * layout change doesn't silently produce zero results.
 */
export function locateRecordsArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;

  if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.relationships_following)) return obj.relationships_following;

    for (const value of Object.values(obj)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => isRawRecord(item) && Array.isArray(item.string_list_data))
      ) {
        return value;
      }
    }
  }

  return null;
}

export interface RecordExtractionResult {
  relationships: Relationship[];
  rawRecords: number;
  invalidRecords: number;
  conflicts: ConflictingRecord[];
}

function relationshipFromStringListEntry(entry: RawStringListEntry): {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  timestamp: number | null;
} | null {
  let normalizedUsername: string | null = null;
  let displayUsername: string | null = null;

  if (typeof entry.value === "string" && entry.value.trim().length > 0) {
    const normalized = normalizeUsername(entry.value);
    if (isPlausibleUsername(normalized)) {
      normalizedUsername = normalized;
      displayUsername = entry.value.trim().replace(/^@+/, "");
    }
  }

  if (!normalizedUsername && typeof entry.href === "string") {
    const derived = usernameFromProfileUrl(entry.href);
    if (derived) {
      normalizedUsername = derived;
      displayUsername = derived;
    }
  }

  if (!normalizedUsername) return null;

  const profileUrl =
    typeof entry.href === "string" && /instagram\.com/i.test(entry.href)
      ? entry.href
      : buildProfileUrl(normalizedUsername);

  const timestamp = typeof entry.timestamp === "number" ? entry.timestamp : null;

  return { normalizedUsername, displayUsername: displayUsername ?? normalizedUsername, profileUrl, timestamp };
}

/**
 * Extracts at most ONE relationship per record. Records are Instagram's own
 * relationship objects (one per account) — `string_list_data` almost always
 * contains a single entry, but only the first is ever consulted, so a record
 * can never fan out into more than one user.
 */
export function extractFromRecords(records: unknown[], fileName: string): RecordExtractionResult {
  const relationships: Relationship[] = [];
  const conflicts: ConflictingRecord[] = [];
  let invalidRecords = 0;

  for (const raw of records) {
    if (!isRawRecord(raw) || !Array.isArray(raw.string_list_data) || raw.string_list_data.length === 0) {
      invalidRecords++;
      continue;
    }

    const primaryEntry = raw.string_list_data[0];
    if (!isRawStringListEntry(primaryEntry)) {
      invalidRecords++;
      continue;
    }

    const parsed = relationshipFromStringListEntry(primaryEntry);
    if (!parsed) {
      invalidRecords++;
      continue;
    }

    if (typeof raw.title === "string" && raw.title.trim().length > 0) {
      const normalizedTitle = normalizeUsername(raw.title);
      if (isPlausibleUsername(normalizedTitle) && normalizedTitle !== parsed.normalizedUsername) {
        conflicts.push({
          file: fileName,
          title: raw.title,
          value: parsed.normalizedUsername,
          used: parsed.normalizedUsername,
        });
      }
    }

    relationships.push({
      normalizedUsername: parsed.normalizedUsername,
      displayUsername: parsed.displayUsername,
      profileUrl: parsed.profileUrl,
      timestamp: parsed.timestamp,
    });
  }

  return { relationships, rawRecords: records.length, invalidRecords, conflicts };
}

/**
 * Last-resort fallback for a JSON shape that doesn't match any known Meta
 * layout: a bounded recursive walk that still only looks for the
 * `string_list_data` structural marker (never guesses at arbitrary strings),
 * so it stays schema-anchored even without knowing the surrounding shape.
 */
export function extractRecursiveFallback(node: unknown, depth = 0): RecordExtractionResult {
  if (depth > 8 || node == null) {
    return { relationships: [], rawRecords: 0, invalidRecords: 0, conflicts: [] };
  }

  if (Array.isArray(node)) {
    return node.reduce<RecordExtractionResult>(
      (acc, item) => mergeResults(acc, extractRecursiveFallback(item, depth + 1)),
      { relationships: [], rawRecords: 0, invalidRecords: 0, conflicts: [] }
    );
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.string_list_data)) {
      return extractFromRecords([obj], "unknown");
    }
    return Object.values(obj).reduce<RecordExtractionResult>(
      (acc, value) => mergeResults(acc, extractRecursiveFallback(value, depth + 1)),
      { relationships: [], rawRecords: 0, invalidRecords: 0, conflicts: [] }
    );
  }

  return { relationships: [], rawRecords: 0, invalidRecords: 0, conflicts: [] };
}

function mergeResults(a: RecordExtractionResult, b: RecordExtractionResult): RecordExtractionResult {
  return {
    relationships: [...a.relationships, ...b.relationships],
    rawRecords: a.rawRecords + b.rawRecords,
    invalidRecords: a.invalidRecords + b.invalidRecords,
    conflicts: [...a.conflicts, ...b.conflicts],
  };
}

/** Parses a single followers/following JSON document, schema-first with a defensive fallback. */
export function extractRelationshipsFromJson(json: unknown, fileName: string): RecordExtractionResult {
  const records = locateRecordsArray(json);
  if (records) return extractFromRecords(records, fileName);
  return extractRecursiveFallback(json);
}
