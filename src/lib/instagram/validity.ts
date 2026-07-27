import type { ExportCoverage } from "./types";

/**
 * complete    — positive evidence the dataset represents the full current graph
 *               (Meta-confirmed all-time coverage, or a matching profile count check).
 * unverified  — no evidence of a problem, but also no proof of completeness
 *               (e.g. a plain JSON export with no coverage header and no profile
 *               count entered). Shown normally, not blocked — this is the default
 *               state for the recommended import path.
 * partial     — specific, verified evidence the dataset is incomplete. Must never
 *               feed authoritative relationship analytics.
 * invalid     — unusable (e.g. followers or following entirely missing).
 */
export type DatasetValidity = "complete" | "partial" | "unverified" | "invalid";

export type ValidityReason =
  | "DATE_RANGE_NOT_ALL_TIME"
  | "FOLLOWERS_MISSING"
  | "FOLLOWING_MISSING"
  | "PARSER_FAILURE"
  | "FOLLOWER_COUNT_MISMATCH"
  | "FOLLOWING_COUNT_MISMATCH"
  | "UNKNOWN_EXPORT_RANGE"
  | "DUPLICATE_IMPORT";

export const VALIDITY_REASON_LABEL: Record<ValidityReason, string> = {
  DATE_RANGE_NOT_ALL_TIME: "The export's own header shows it does not cover all time.",
  FOLLOWERS_MISSING: "No follower relationships were found in this export.",
  FOLLOWING_MISSING: "No following relationships were found in this export.",
  PARSER_FAILURE: "Orbly could not reliably parse this export.",
  FOLLOWER_COUNT_MISMATCH:
    "The number of followers found is significantly lower than what you entered from your Instagram profile.",
  FOLLOWING_COUNT_MISMATCH:
    "The number of accounts you follow found is significantly lower than what you entered from your Instagram profile.",
  UNKNOWN_EXPORT_RANGE: "This export doesn't declare what date range it covers.",
  DUPLICATE_IMPORT: "This exact dataset was already imported.",
};

/**
 * The two numbers shown at the top of the user's own Instagram profile, entered
 * manually to sanity-check an export. Used ONLY as a coverage check — never to
 * fabricate, add, or remove relationship records.
 */
export interface ProfileReferenceCounts {
  followers: number;
  following: number;
  recordedAt: string;
}

export interface ValidityAssessment {
  validity: DatasetValidity;
  reasons: ValidityReason[];
}

/** A dataset more than this fraction short of the entered profile count is treated as a real mismatch. */
export const MISMATCH_THRESHOLD = 0.1;

export interface CountVerification {
  profileCount: number;
  exportCount: number;
  difference: number;
  /** exportCount / profileCount, as a 0-1 fraction. Null when profileCount is 0. */
  coverageRatio: number | null;
  isMismatch: boolean;
}

/** Compares a parsed export count against a manually-entered profile count. Read-only diagnostic — never mutates data. */
export function verifyCount(exportCount: number, profileCount: number): CountVerification {
  const difference = exportCount - profileCount;
  const coverageRatio = profileCount > 0 ? exportCount / profileCount : null;
  const deficit = profileCount > 0 ? (profileCount - exportCount) / profileCount : 0;
  return {
    profileCount,
    exportCount,
    difference,
    coverageRatio,
    isMismatch: deficit > MISMATCH_THRESHOLD,
  };
}

export function assessDatasetValidity(input: {
  followerCount: number;
  followingCount: number;
  coverage: ExportCoverage | null;
  profileReference?: ProfileReferenceCounts | null;
}): ValidityAssessment {
  const reasons: ValidityReason[] = [];

  if (input.followerCount === 0) reasons.push("FOLLOWERS_MISSING");
  if (input.followingCount === 0) reasons.push("FOLLOWING_MISSING");
  if (input.coverage?.looksLimited) reasons.push("DATE_RANGE_NOT_ALL_TIME");

  if (input.profileReference) {
    if (verifyCount(input.followerCount, input.profileReference.followers).isMismatch) {
      reasons.push("FOLLOWER_COUNT_MISMATCH");
    }
    if (verifyCount(input.followingCount, input.profileReference.following).isMismatch) {
      reasons.push("FOLLOWING_COUNT_MISMATCH");
    }
  }

  if (reasons.includes("FOLLOWERS_MISSING") || reasons.includes("FOLLOWING_MISSING")) {
    return { validity: "invalid", reasons };
  }
  if (reasons.length > 0) {
    return { validity: "partial", reasons };
  }
  if (input.coverage && !input.coverage.looksLimited) {
    return { validity: "complete", reasons };
  }
  if (input.profileReference) {
    return { validity: "complete", reasons };
  }
  return { validity: "unverified", reasons: ["UNKNOWN_EXPORT_RANGE"] };
}

/** Snapshots created before validity tracking existed: re-derive validity from whatever was persisted at the time. */
export function deriveLegacyValidity(legacy: {
  followersCount: number;
  followingCount: number;
  coverageFromIso?: string | null;
  coverageToIso?: string | null;
  coverageLooksLimited?: boolean;
}): ValidityAssessment {
  const coverage: ExportCoverage | null =
    legacy.coverageFromIso && legacy.coverageToIso
      ? {
          fromIso: legacy.coverageFromIso,
          toIso: legacy.coverageToIso,
          spanDays: Math.round(
            (Date.parse(legacy.coverageToIso) - Date.parse(legacy.coverageFromIso)) / (1000 * 60 * 60 * 24)
          ),
          looksLimited: !!legacy.coverageLooksLimited,
          source: "meta-explicit",
        }
      : null;

  return assessDatasetValidity({
    followerCount: legacy.followersCount,
    followingCount: legacy.followingCount,
    coverage,
    profileReference: null,
  });
}
