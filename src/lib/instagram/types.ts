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
 * Where a piece of date-range information came from. This distinction matters:
 * a range Meta explicitly stamps into the export header is proof of what was
 * requested. A range merely inferred from the min/max relationship timestamps
 * inside the file is NOT proof of the requested export window — it only proves
 * when the oldest/newest visible relationship happened to occur, which is a
 * different (and much weaker) fact. We never present the latter as the former.
 */
export type DateRangeSource = "meta-explicit" | "unknown";

/**
 * The date window Meta says the export actually covers, read verbatim from the
 * "Contains data you requested from X to Y" header Meta stamps into its own
 * export files. Meta prints this in the export's own header, and it does NOT
 * always match what you asked for — an export requested as "All time" can
 * still come back covering only the last year, which silently truncates your
 * follower list. This is ALWAYS meta-explicit; Orbly never derives a coverage
 * window from relationship timestamps.
 */
export interface ExportCoverage {
  fromIso: string;
  toIso: string;
  spanDays: number;
  /** True when the window is too short to plausibly be a true all-time export. */
  looksLimited: boolean;
  source: "meta-explicit";
}

/** Per-file raw vs. parsed vs. invalid record counts, for diagnosability. */
export interface FileParseDiagnostic {
  fileName: string;
  /** Top-level relationship entries found in the file, before any filtering. */
  rawRecords: number;
  /** Entries that yielded a usable relationship. */
  parsedRecords: number;
  /** Entries that were structurally present but failed username extraction/validation. */
  invalidRecords: number;
}

/** A relationship record whose title and string_list_data value disagreed. Logged, never double-counted. */
export interface ConflictingRecord {
  file: string;
  title: string;
  value: string;
  /** The value that was actually used for the relationship. */
  used: string;
}

export interface ParseDiagnostics {
  followerFilesUsed: string[];
  followingFilesUsed: string[];
  followerFileDetails: FileParseDiagnostic[];
  followingFileDetails: FileParseDiagnostic[];
  ignoredFiles: string[];
  ignoredFileCount: number;
  warnings: string[];
  coverage: ExportCoverage | null;

  followerRawRecords: number;
  followerParsedRecords: number;
  followerUniqueUsers: number;
  followerDuplicates: number;
  followerInvalidRecords: number;

  followingRawRecords: number;
  followingParsedRecords: number;
  followingUniqueUsers: number;
  followingDuplicates: number;
  followingInvalidRecords: number;

  conflictingRecords: ConflictingRecord[];
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
