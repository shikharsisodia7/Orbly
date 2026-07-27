import { describe, expect, it } from "vitest";
import { assessDatasetValidity, deriveLegacyValidity, verifyCount } from "./validity";
import type { ExportCoverage } from "./types";

const limitedCoverage: ExportCoverage = {
  fromIso: "2025-07-25T00:00:00.000Z",
  toIso: "2026-07-25T00:00:00.000Z",
  spanDays: 365,
  looksLimited: true,
  source: "meta-explicit",
};

const allTimeCoverage: ExportCoverage = {
  fromIso: "2014-01-01T00:00:00.000Z",
  toIso: "2026-01-01T00:00:00.000Z",
  spanDays: 4383,
  looksLimited: false,
  source: "meta-explicit",
};

describe("assessDatasetValidity — the reported real-world failure", () => {
  it("marks a date-limited export as partial, exactly matching the reported 573-follower bug", () => {
    // Real report: Instagram profile shows 3,866 followers / 5,783 following,
    // but the export was a date-windowed HTML file covering only the last year,
    // producing 573 followers / 5,974 following.
    const { validity, reasons } = assessDatasetValidity({
      followerCount: 573,
      followingCount: 5974,
      coverage: limitedCoverage,
    });

    expect(validity).toBe("partial");
    expect(reasons).toContain("DATE_RANGE_NOT_ALL_TIME");
  });

  it("also flags it as partial via a manually-entered profile count mismatch, independent of coverage", () => {
    const { validity, reasons } = assessDatasetValidity({
      followerCount: 573,
      followingCount: 5974,
      coverage: null,
      profileReference: { followers: 3866, following: 5783, recordedAt: new Date().toISOString() },
    });

    expect(validity).toBe("partial");
    expect(reasons).toContain("FOLLOWER_COUNT_MISMATCH");
    // Following came out HIGHER than the profile shows (deactivated accounts, etc) —
    // that alone must never be flagged as a mismatch.
    expect(reasons).not.toContain("FOLLOWING_COUNT_MISMATCH");
  });
});

describe("assessDatasetValidity — everyday cases", () => {
  it("is unverified (not blocked) for a plain JSON export with no coverage header and no profile check", () => {
    const { validity } = assessDatasetValidity({
      followerCount: 3866,
      followingCount: 5783,
      coverage: null,
    });
    expect(validity).toBe("unverified");
  });

  it("is complete when Meta's own header confirms a genuine all-time window", () => {
    const { validity, reasons } = assessDatasetValidity({
      followerCount: 3866,
      followingCount: 5783,
      coverage: allTimeCoverage,
    });
    expect(validity).toBe("complete");
    expect(reasons).toHaveLength(0);
  });

  it("is complete when a manually-entered profile count matches within tolerance", () => {
    const { validity } = assessDatasetValidity({
      followerCount: 3860,
      followingCount: 5783,
      coverage: null,
      profileReference: { followers: 3866, following: 5783, recordedAt: new Date().toISOString() },
    });
    expect(validity).toBe("complete");
  });

  it("is invalid when followers are entirely missing", () => {
    const { validity, reasons } = assessDatasetValidity({
      followerCount: 0,
      followingCount: 100,
      coverage: null,
    });
    expect(validity).toBe("invalid");
    expect(reasons).toContain("FOLLOWERS_MISSING");
  });

  it("does not flag following as mismatched just because it exceeds the profile count", () => {
    const { validity, reasons } = assessDatasetValidity({
      followerCount: 3866,
      followingCount: 5974,
      coverage: allTimeCoverage,
      profileReference: { followers: 3866, following: 5783, recordedAt: new Date().toISOString() },
    });
    expect(validity).toBe("complete");
    expect(reasons).not.toContain("FOLLOWING_COUNT_MISMATCH");
  });
});

describe("verifyCount", () => {
  it("computes the exact reported mismatch", () => {
    const result = verifyCount(573, 3866);
    expect(result.difference).toBe(573 - 3866);
    expect(result.coverageRatio).toBeCloseTo(573 / 3866, 5);
    expect(result.isMismatch).toBe(true);
  });

  it("does not flag a following overage as a mismatch", () => {
    const result = verifyCount(5974, 5783);
    expect(result.isMismatch).toBe(false);
  });

  it("handles a zero profile count without dividing by zero", () => {
    const result = verifyCount(10, 0);
    expect(result.coverageRatio).toBeNull();
    expect(result.isMismatch).toBe(false);
  });
});

describe("deriveLegacyValidity — migration of pre-fix snapshots", () => {
  it("re-derives partial for the exact broken snapshot that was already persisted", () => {
    const { validity, reasons } = deriveLegacyValidity({
      followersCount: 573,
      followingCount: 5974,
      coverageFromIso: "2025-07-25T00:00:00.000Z",
      coverageToIso: "2026-07-25T00:00:00.000Z",
      coverageLooksLimited: true,
    });
    expect(validity).toBe("partial");
    expect(reasons).toContain("DATE_RANGE_NOT_ALL_TIME");
  });

  it("marks a legacy snapshot with no coverage data as unverified, not complete", () => {
    const { validity } = deriveLegacyValidity({
      followersCount: 1200,
      followingCount: 900,
    });
    expect(validity).toBe("unverified");
  });
});
