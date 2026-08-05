import type { MatchMode } from "./chat-tool-schemas";

/**
 * The single shared implementation of "does this normalized text match this
 * query under this mode." Strict and deterministic — each mode maps to
 * exactly one JS string method, no fuzzy/loose fallback — so "starts with a"
 * can never accidentally match text with an "a" in the middle, and
 * "contains 3" can never accidentally require it at a specific position.
 *
 * Shared by chat-data.ts's username search/pagination and
 * exclusion-rules.ts's persistent exclusion-rule matching, so the two
 * features can never silently drift into different matching behavior.
 */
export function matchesQuery(normalizedText: string, query: string, mode: MatchMode): boolean {
  switch (mode) {
    case "startsWith":
      return normalizedText.startsWith(query);
    case "endsWith":
      return normalizedText.endsWith(query);
    case "contains":
    default:
      return normalizedText.includes(query);
  }
}

/** Trims, lowercases, and strips a leading @ — the same normalization used for usernames, applied to free-text queries/patterns. */
export function normalizeQueryText(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}
