import { describe, expect, it } from "vitest";
import { extractCoverageFromHtml, extractRelationshipsFromHtml } from "./html-extract";

// Modeled on Meta's legacy HTML export markup shape (synthetic usernames only).
const FOLLOWERS_HTML = `
<html><body><main>
<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder"><div class="_a6-p"><div><div><a target="_blank" href="https://www.instagram.com/river.sample">river.sample</a></div><div>Jul 25, 2026 1:28 pm</div></div></div></div>
<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder"><div class="_a6-p"><div><div><a target="_blank" href="https://www.instagram.com/maya.sample">maya.sample</a></div><div>Jul 24, 2026 6:23 am</div></div></div></div>
</main></body></html>
`;

// Modeled on the "following.html" shape, which wraps the username in an <h2>
// and links to an internal "_u/" redirect rather than the plain profile path.
const FOLLOWING_HTML = `
<html><body><main>
<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder"><h2 class="_3-95 _2pim _a6-h _a6-i">jordan.sample</h2><div class="_a6-p"><div><div><a target="_blank" href="https://www.instagram.com/_u/jordan.sample">https://www.instagram.com/_u/jordan.sample</a></div><div>Jul 25, 2026 5:39 pm</div></div></div></div>
</main></body></html>
`;

describe("extractRelationshipsFromHtml", () => {
  it("extracts username, profile url and timestamp from the plain-anchor format", () => {
    const { relationships, rawRecords, invalidRecords } = extractRelationshipsFromHtml(FOLLOWERS_HTML);
    expect(relationships).toHaveLength(2);
    expect(rawRecords).toBe(2);
    expect(invalidRecords).toBe(0);
    expect(relationships[0].normalizedUsername).toBe("river.sample");
    expect(relationships[0].profileUrl).toBe("https://www.instagram.com/river.sample/");
    expect(relationships[0].timestamp).not.toBeNull();
    expect(relationships[1].normalizedUsername).toBe("maya.sample");
  });

  it("prefers the h2 username and resolves an internal _u/ redirect href", () => {
    const { relationships } = extractRelationshipsFromHtml(FOLLOWING_HTML);
    expect(relationships).toHaveLength(1);
    expect(relationships[0].normalizedUsername).toBe("jordan.sample");
    expect(relationships[0].profileUrl).toBe("https://www.instagram.com/jordan.sample/");
  });

  it("returns no relationships and no raw records for unrelated HTML", () => {
    const result = extractRelationshipsFromHtml("<html><body>hello</body></html>");
    expect(result.relationships).toHaveLength(0);
    expect(result.rawRecords).toBe(0);
  });

  it("counts malformed blocks as invalid instead of silently dropping them", () => {
    const malformed = `<div class="pam uiBoxWhite noborder"><p>no anchor or h2 here</p></div>`;
    expect(() => extractRelationshipsFromHtml(malformed)).not.toThrow();
    const result = extractRelationshipsFromHtml(malformed);
    expect(result.relationships).toHaveLength(0);
    expect(result.rawRecords).toBe(1);
    expect(result.invalidRecords).toBe(1);
  });

  it("counts a mix of valid and invalid blocks correctly", () => {
    const mixed = FOLLOWERS_HTML.replace(
      "</main>",
      `<div class="pam uiBoxWhite noborder"><p>broken block</p></div></main>`
    );
    const result = extractRelationshipsFromHtml(mixed);
    expect(result.rawRecords).toBe(3);
    expect(result.relationships).toHaveLength(2);
    expect(result.invalidRecords).toBe(1);
  });
});

describe("extractCoverageFromHtml", () => {
  // Matches the header Meta stamps into every HTML export file.
  const header = (fromIso: string, toIso: string) =>
    `<div>Contains data you requested from <time datetime="${fromIso}">a date</time> to <time datetime="${toIso}">another date</time></div>`;

  it("flags a one-year window as a limited (non all-time) export", () => {
    const coverage = extractCoverageFromHtml(header("2025-07-26T03:59Z", "2026-07-26T03:59Z"));
    expect(coverage).not.toBeNull();
    expect(coverage!.spanDays).toBe(365);
    expect(coverage!.looksLimited).toBe(true);
  });

  it("does not flag a genuinely long window", () => {
    const coverage = extractCoverageFromHtml(header("2014-01-01T00:00Z", "2026-01-01T00:00Z"));
    expect(coverage).not.toBeNull();
    expect(coverage!.looksLimited).toBe(false);
  });

  it("returns null when the header is absent", () => {
    expect(extractCoverageFromHtml("<html><body>no header</body></html>")).toBeNull();
  });

  it("returns null for a malformed or inverted date range", () => {
    expect(extractCoverageFromHtml(header("not-a-date", "2026-07-26T03:59Z"))).toBeNull();
    expect(extractCoverageFromHtml(header("2026-07-26T03:59Z", "2025-07-26T03:59Z"))).toBeNull();
  });
});
