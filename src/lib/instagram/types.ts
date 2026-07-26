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

export interface ParseDiagnostics {
  followerFilesUsed: string[];
  followingFilesUsed: string[];
  ignoredFiles: string[];
  ignoredFileCount: number;
  warnings: string[];
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
