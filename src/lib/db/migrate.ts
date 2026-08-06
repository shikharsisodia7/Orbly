import { deriveLegacyValidity } from "@/lib/instagram/validity";
import type { ExclusionRuleRecord, SnapshotRecord } from "./schema";

type PartiallyValidatedSnapshot = Omit<
  SnapshotRecord,
  "dateRangeSource" | "parserVersion" | "validity" | "validityReasons" | "profileReferenceCounts"
> &
  Partial<
    Pick<
      SnapshotRecord,
      "dateRangeSource" | "parserVersion" | "validity" | "validityReasons" | "profileReferenceCounts"
    >
  >;

/**
 * Backfills validity-tracking fields onto a snapshot record that predates
 * them (imported before this fix, or restored from an older backup file).
 * Re-derives validity from whatever coverage data was already persisted
 * rather than defaulting to "complete" — an unverified/partial snapshot must
 * never silently become trusted just because it's old. Non-destructive: only
 * fills in fields that are actually missing.
 */
export function normalizeSnapshotRecord(raw: PartiallyValidatedSnapshot): SnapshotRecord {
  if (raw.validity && raw.parserVersion != null && raw.dateRangeSource) {
    return raw as SnapshotRecord;
  }

  const derived = deriveLegacyValidity({
    followersCount: raw.followersCount,
    followingCount: raw.followingCount,
    coverageFromIso: raw.coverageFromIso,
    coverageToIso: raw.coverageToIso,
    coverageLooksLimited: raw.coverageLooksLimited,
  });

  return {
    ...raw,
    dateRangeSource: raw.dateRangeSource ?? (raw.coverageFromIso ? "meta-explicit" : "unknown"),
    parserVersion: raw.parserVersion ?? 1,
    validity: raw.validity ?? derived.validity,
    validityReasons: raw.validityReasons ?? derived.reasons,
    profileReferenceCounts: raw.profileReferenceCounts ?? null,
  };
}

/**
 * Backfills `field` onto an exclusion rule record created before bio-based
 * rules existed. Every rule from that era was a username rule — that was the
 * only kind that could exist — so this is a safe, unambiguous default rather
 * than a guess.
 */
export function normalizeExclusionRuleRecord(
  raw: Omit<ExclusionRuleRecord, "field"> & Partial<Pick<ExclusionRuleRecord, "field">>
): ExclusionRuleRecord {
  return { ...raw, field: raw.field ?? "username" };
}
