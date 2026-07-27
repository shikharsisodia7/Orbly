/**
 * Core types for Instagram export parsing.
 * These types are intentionally decoupled from the Dexie DB schema in src/lib/db
 * so the parser can be tested and reused independently of persistence.
 */

export interface Relationship {
  normalizedUsername: string;
  displayUsername: string;
  profileUrl: string;
  /** Unix seconds if Instagram provided one, otherwise null. Never fabricated. */
  timestamp: number | null;
}

/**
 * The date window Meta says the export actually covers. Meta prints this in the
 * export's own header, and it does NOT always match what you asked for — an
 * export requested as "All time" can still come back covering only the last
 * year, which silently truncates your follower list.
 */
export interface ExportCoverage {
  fromIso: string;
  toIso: string;
  spanDays: number;
  /** True when the window is too short to plausibly be a true all-time export. */
  looksLimited: boolean;
}

export interface ParseDiagnostics {
  followerFilesUsed: string[];
  followingFilesUsed: string[];
  ignoredFiles: string[];
  ignoredFileCount: number;
  warnings: string[];
  coverage: ExportCoverage | null;
}

export interface ParsedExport {
  followers: Relationship[];
  following: Relationship[];
  diagnostics: ParseDiagnostics;
  /** True if the archive appears to be Instagram's legacy HTML export instead of JSON. */
  looksLikeHtmlExport: boolean;
}

export type FileClassification =
  | "followers"
  | "following"
  | "ignored";

export interface CandidateFile {
  path: string;
  fileName: string;
  raw: string;
}

export interface ClassifiedFile extends CandidateFile {
  classification: FileClassification;
  reason: string;
}
