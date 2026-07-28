import JSZip from "jszip";
import { classifyFile, looksLikeHtmlFile, naturalFileSort } from "./detect-files";
import { extractCoverageFromHtml, extractRelationshipsFromHtml } from "./html-extract";
import { extractRelationshipsFromJson } from "./record-extract";
import type {
  ConflictingRecord,
  FileParseDiagnostic,
  ParsedExport,
  ParseDiagnostics,
  Relationship,
} from "./types";

/**
 * Bumped whenever parsing/extraction logic changes in a way that could change
 * results for an already-imported export. Snapshots store the version they
 * were created with so old, pre-fix imports can be identified and
 * re-validated rather than trusted at face value.
 */
export const PARSER_VERSION = 3;

export const MAX_ZIP_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB safety ceiling

function getByteLength(file: File | Blob | ArrayBuffer): number | null {
  if (file instanceof ArrayBuffer) return file.byteLength;
  if (typeof (file as Blob).size === "number") return (file as Blob).size;
  return null;
}

function dedupe(relationships: Relationship[]): { unique: Relationship[]; duplicates: number } {
  const map = new Map<string, Relationship>();
  for (const rel of relationships) {
    const existing = map.get(rel.normalizedUsername);
    if (!existing) {
      map.set(rel.normalizedUsername, rel);
    } else if (existing.timestamp == null && rel.timestamp != null) {
      map.set(rel.normalizedUsername, rel);
    }
  }
  return { unique: Array.from(map.values()), duplicates: relationships.length - map.size };
}

export interface ParseOptions {
  /** Called with a machine-readable stage id as parsing progresses. */
  onStage?: (stage: ParseStage) => void;
}

export type ParseStage =
  | "opening-zip"
  | "scanning-files"
  | "finding-followers"
  | "finding-following"
  | "normalizing"
  | "deduplicating"
  | "done";

export async function parseInstagramExport(
  file: File | Blob | ArrayBuffer,
  options: ParseOptions = {}
): Promise<ParsedExport> {
  const { onStage } = options;

  const byteLength = getByteLength(file);
  if (byteLength != null && byteLength > MAX_ZIP_SIZE_BYTES) {
    throw new Error(
      "This export file is larger than we can safely process in the browser (2GB limit). Try requesting a smaller export."
    );
  }

  onStage?.("opening-zip");

  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files)
    .filter((f) => !f.dir)
    .sort((a, b) => naturalFileSort(a.name, b.name));

  onStage?.("scanning-files");

  const htmlFiles = entries.filter((e) => looksLikeHtmlFile(e.name));
  const jsonFiles = entries.filter((e) => /\.json$/i.test(e.name));
  const candidateFiles = entries.filter((e) => /\.(json|html?)$/i.test(e.name));

  const looksLikeHtmlExport = jsonFiles.length === 0 && htmlFiles.length > 0;

  const followerRelationships: Relationship[] = [];
  const followingRelationships: Relationship[] = [];
  const followerFileDetails: FileParseDiagnostic[] = [];
  const followingFileDetails: FileParseDiagnostic[] = [];
  const conflictingRecords: ConflictingRecord[] = [];

  const diagnostics: ParseDiagnostics = {
    followerFilesUsed: [],
    followingFilesUsed: [],
    followerFileDetails,
    followingFileDetails,
    ignoredFiles: [],
    ignoredFileCount: 0,
    warnings: [],
    coverage: null,
    followerRawRecords: 0,
    followerParsedRecords: 0,
    followerUniqueUsers: 0,
    followerDuplicates: 0,
    followerInvalidRecords: 0,
    followingRawRecords: 0,
    followingParsedRecords: 0,
    followingUniqueUsers: 0,
    followingDuplicates: 0,
    followingInvalidRecords: 0,
    conflictingRecords,
  };

  onStage?.("finding-followers");

  for (const entry of candidateFiles) {
    const fileName = entry.name.split("/").pop() ?? entry.name;
    const isHtml = looksLikeHtmlFile(fileName);

    let raw: string;
    try {
      raw = await entry.async("text");
    } catch {
      diagnostics.warnings.push(`Could not read ${entry.name}`);
      continue;
    }

    let relationships: Relationship[] = [];
    let rawRecords = 0;
    let invalidRecords = 0;
    let classification: ReturnType<typeof classifyFile>["classification"];

    if (isHtml) {
      classification = classifyFile(fileName, undefined).classification;
      if (classification === "followers" || classification === "following") {
        const result = extractRelationshipsFromHtml(raw);
        relationships = result.relationships;
        rawRecords = result.rawRecords;
        invalidRecords = result.invalidRecords;
        diagnostics.coverage ??= extractCoverageFromHtml(raw);
      }
    } else {
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        diagnostics.ignoredFiles.push(fileName);
        diagnostics.ignoredFileCount++;
        continue;
      }
      classification = classifyFile(fileName, json).classification;
      if (classification === "followers" || classification === "following") {
        const result = extractRelationshipsFromJson(json, fileName);
        relationships = result.relationships;
        rawRecords = result.rawRecords;
        invalidRecords = result.invalidRecords;
        conflictingRecords.push(...result.conflicts);
      }
    }

    if (classification === "followers") {
      followerRelationships.push(...relationships);
      diagnostics.followerFilesUsed.push(fileName);
      followerFileDetails.push({
        fileName,
        rawRecords,
        parsedRecords: relationships.length,
        invalidRecords,
      });
      diagnostics.followerRawRecords += rawRecords;
      diagnostics.followerInvalidRecords += invalidRecords;
    } else if (classification === "following") {
      followingRelationships.push(...relationships);
      diagnostics.followingFilesUsed.push(fileName);
      followingFileDetails.push({
        fileName,
        rawRecords,
        parsedRecords: relationships.length,
        invalidRecords,
      });
      diagnostics.followingRawRecords += rawRecords;
      diagnostics.followingInvalidRecords += invalidRecords;
    } else {
      diagnostics.ignoredFiles.push(fileName);
      diagnostics.ignoredFileCount++;
    }
  }

  onStage?.("finding-following");
  onStage?.("normalizing");
  onStage?.("deduplicating");

  diagnostics.followerParsedRecords = followerRelationships.length;
  diagnostics.followingParsedRecords = followingRelationships.length;

  const { unique: followers, duplicates: followerDuplicates } = dedupe(followerRelationships);
  const { unique: following, duplicates: followingDuplicates } = dedupe(followingRelationships);

  diagnostics.followerUniqueUsers = followers.length;
  diagnostics.followerDuplicates = followerDuplicates;
  diagnostics.followingUniqueUsers = following.length;
  diagnostics.followingDuplicates = followingDuplicates;

  onStage?.("done");

  return {
    followers,
    following,
    diagnostics,
    looksLikeHtmlExport,
  };
}
