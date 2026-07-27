import { describe, expect, it } from "vitest";
import { normalizeSnapshotRecord } from "./migrate";

describe("normalizeSnapshotRecord", () => {
  it("backfills partial validity for the exact pre-fix snapshot from the field report", () => {
    // This is the shape of the Jul 26, 2026 snapshot that shipped before validity
    // tracking existed: 573 followers from a date-limited export, saved without
    // any validity field at all.
    const legacy = {
      id: "snap-1",
      createdAt: "2026-07-26T00:00:00.000Z",
      importedAt: "2026-07-26T00:00:00.000Z",
      followersCount: 573,
      followingCount: 5974,
      datasetHash: "abc123",
      originalFileName: "export.zip",
      coverageFromIso: "2025-07-25T00:00:00.000Z",
      coverageToIso: "2026-07-25T00:00:00.000Z",
      coverageLooksLimited: true,
    } as Parameters<typeof normalizeSnapshotRecord>[0];

    const normalized = normalizeSnapshotRecord(legacy);

    expect(normalized.validity).toBe("partial");
    expect(normalized.validityReasons).toContain("DATE_RANGE_NOT_ALL_TIME");
    expect(normalized.parserVersion).toBe(1);
    expect(normalized.dateRangeSource).toBe("meta-explicit");
  });

  it("marks a legacy snapshot with no coverage data as unverified rather than complete", () => {
    const legacy = {
      id: "snap-2",
      createdAt: "2026-01-01T00:00:00.000Z",
      importedAt: "2026-01-01T00:00:00.000Z",
      followersCount: 1200,
      followingCount: 900,
      datasetHash: "def456",
      originalFileName: null,
    } as Parameters<typeof normalizeSnapshotRecord>[0];

    const normalized = normalizeSnapshotRecord(legacy);

    expect(normalized.validity).toBe("unverified");
    expect(normalized.parserVersion).toBe(1);
    expect(normalized.dateRangeSource).toBe("unknown");
  });

  it("is a no-op for a snapshot that already has validity tracking", () => {
    const current = {
      id: "snap-3",
      createdAt: "2026-01-01T00:00:00.000Z",
      importedAt: "2026-01-01T00:00:00.000Z",
      followersCount: 500,
      followingCount: 500,
      datasetHash: "ghi789",
      originalFileName: null,
      dateRangeSource: "unknown" as const,
      parserVersion: 2,
      validity: "unverified" as const,
      validityReasons: ["UNKNOWN_EXPORT_RANGE" as const],
      profileReferenceCounts: null,
    };

    const normalized = normalizeSnapshotRecord(current);
    expect(normalized).toEqual(current);
  });
});
