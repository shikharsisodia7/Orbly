import { buildProfileUrl, isPlausibleUsername, normalizeUsername, usernameFromProfileUrl } from "./normalize";
import type { ExportCoverage, Relationship } from "./types";

/**
 * A genuine "All time" export spans from account creation to today. Anything
 * covering less than roughly two years is almost certainly a windowed export,
 * which means the follower list in it is incomplete.
 */
const ALL_TIME_MIN_SPAN_DAYS = 730;

const COVERAGE_MARKER =
  /Contains data you requested from\s*<time datetime="([^"]+)"[^>]*>[^<]*<\/time>\s*to\s*<time datetime="([^"]+)"/i;

/**
 * Reads the date window Meta stamps into the export's own header. Returns null
 * when the header isn't present (older exports, or JSON-format exports which
 * don't carry it).
 */
export function extractCoverageFromHtml(html: string): ExportCoverage | null {
  const match = html.match(COVERAGE_MARKER);
  if (!match) return null;

  const fromMs = Date.parse(match[1]);
  const toMs = Date.parse(match[2]);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) return null;

  const spanDays = Math.round((toMs - fromMs) / (1000 * 60 * 60 * 24));

  return {
    fromIso: new Date(fromMs).toISOString(),
    toIso: new Date(toMs).toISOString(),
    spanDays,
    looksLimited: spanDays < ALL_TIME_MIN_SPAN_DAYS,
  };
}

/**
 * Meta's legacy HTML export renders each follower/following record as a
 * repeating container div. The container class list has stayed stable
 * across export batches, but we match loosely (any class containing both
 * tokens, in any order) so small Meta-side markup tweaks don't break this.
 */
const BLOCK_MARKER = /<div[^>]*class="[^"]*\buiBoxWhite\b[^"]*\bnoborder\b[^"]*"[^>]*>/gi;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function extractFromBlock(block: string): Relationship | null {
  const h2Match = block.match(/<h2[^>]*>([^<]*)<\/h2>/i);
  const anchorMatch = block.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/i);
  if (!h2Match && !anchorMatch) return null;

  let normalizedUsername: string | null = null;
  let displayUsername: string | null = null;

  const h2Text = h2Match?.[1] ? decodeHtmlEntities(h2Match[1]).trim() : "";
  if (h2Text) {
    const normalized = normalizeUsername(h2Text);
    if (isPlausibleUsername(normalized)) {
      normalizedUsername = normalized;
      displayUsername = h2Text.replace(/^@+/, "");
    }
  }

  if (!normalizedUsername && anchorMatch) {
    const href = decodeHtmlEntities(anchorMatch[1]);
    const derivedFromHref = usernameFromProfileUrl(href);
    if (derivedFromHref) {
      normalizedUsername = derivedFromHref;
      displayUsername = derivedFromHref;
    } else {
      const anchorText = decodeHtmlEntities(anchorMatch[2]).trim();
      if (anchorText && !/^https?:\/\//i.test(anchorText)) {
        const normalized = normalizeUsername(anchorText);
        if (isPlausibleUsername(normalized)) {
          normalizedUsername = normalized;
          displayUsername = anchorText.replace(/^@+/, "");
        }
      }
    }
  }

  if (!normalizedUsername) return null;

  const plainDivTexts = [...block.matchAll(/<div>([^<]+)<\/div>/gi)]
    .map((m) => decodeHtmlEntities(m[1]).trim())
    .filter(Boolean);
  const dateText = plainDivTexts.length > 0 ? plainDivTexts[plainDivTexts.length - 1] : null;

  let timestamp: number | null = null;
  if (dateText) {
    const parsed = Date.parse(dateText);
    if (!Number.isNaN(parsed)) timestamp = Math.floor(parsed / 1000);
  }

  return {
    normalizedUsername,
    displayUsername: displayUsername ?? normalizedUsername,
    profileUrl: buildProfileUrl(normalizedUsername),
    timestamp,
  };
}

/**
 * Extracts relationship records from Meta's HTML-format follower/following
 * export files. Each record lives in its own repeating container div, so we
 * split on the marker and parse each fragment independently — a malformed
 * or unexpected fragment is simply skipped rather than aborting the import.
 */
export function extractRelationshipsFromHtml(html: string): Relationship[] {
  const starts: number[] = [];
  let match: RegExpExecArray | null;
  BLOCK_MARKER.lastIndex = 0;
  while ((match = BLOCK_MARKER.exec(html))) {
    starts.push(match.index);
  }
  if (starts.length === 0) return [];

  starts.push(html.length);
  const out: Relationship[] = [];
  for (let i = 0; i < starts.length - 1; i++) {
    const block = html.slice(starts[i], starts[i + 1]);
    const rel = extractFromBlock(block);
    if (rel) out.push(rel);
  }
  return out;
}
