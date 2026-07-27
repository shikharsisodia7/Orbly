import JSZip from "jszip";
import {
  buildProfileUrl,
  isPlausibleUsername,
  normalizeUsername,
  usernameFromProfileUrl,
} from "./normalize";
import { classifyFile, looksLikeHtmlFile } from "./detect-files";
import { extractCoverageFromHtml, extractRelationshipsFromHtml } from "./html-extract";
import type { ParsedExport, ParseDiagnostics, Relationship } from "./types";

export const MAX_ZIP_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB safety ceiling

function getByteLength(file: File | Blob | ArrayBuffer): number | null {
  if (file instanceof ArrayBuffer) return file.byteLength;
  if (typeof (file as Blob).size === "number") return (file as Blob).size;
  return null;
}

interface RawEntry {
  href?: unknown;
  value?: unknown;
  timestamp?: unknown;
}

function isRawEntry(value: unknown): value is RawEntry {
  return typeof value === "object" && value !== null;
}

function relationshipFromEntry(entry: RawEntry): Relationship | null {
  let normalizedUsername: string | null = null;
  let displayUsername: string | null = null;

  if (typeof entry.value === "string" && entry.value.trim().length > 0) {
    const normalized = normalizeUsername(entry.value);
    if (isPlausibleUsername(normalized)) {
      normalizedUsername = normalized;
      displayUsername = entry.value.trim().replace(/^@+/, "");
    }
  }

  if (!normalizedUsername && typeof entry.href === "string") {
    const derived = usernameFromProfileUrl(entry.href);
    if (derived) {
      normalizedUsername = derived;
      displayUsername = derived;
    }
  }

  if (!normalizedUsername) return null;

  const profileUrl =
    typeof entry.href === "string" && /instagram\.com/i.test(entry.href)
      ? entry.href
      : buildProfileUrl(normalizedUsername);

  const timestamp = typeof entry.timestamp === "number" ? entry.timestamp : null;

  return {
    normalizedUsername,
    displayUsername: displayUsername ?? normalizedUsername,
    profileUrl,
    timestamp,
  };
}

/**
 * Recursively walks an arbitrarily-shaped Instagram export JSON document
 * looking for `string_list_data` arrays, which is where Meta stores the
 * actual username/href/timestamp records regardless of how the surrounding
 * structure is wrapped (relationships_following, plain array, etc).
 */
export function extractRelationships(node: unknown, depth = 0): Relationship[] {
  const out: Relationship[] = [];
  if (depth > 8 || node == null) return out;

  if (Array.isArray(node)) {
    for (const item of node) out.push(...extractRelationships(item, depth + 1));
    return out;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.string_list_data)) {
      for (const rawEntry of obj.string_list_data) {
        if (isRawEntry(rawEntry)) {
          const rel = relationshipFromEntry(rawEntry);
          if (rel) out.push(rel);
        }
      }
      return out;
    }
    for (const value of Object.values(obj)) {
      out.push(...extractRelationships(value, depth + 1));
    }
  }

  return out;
}

function dedupe(relationships: Relationship[]): Relationship[] {
  const map = new Map<string, Relationship>();
  for (const rel of relationships) {
    const existing = map.get(rel.normalizedUsername);
    if (!existing) {
      map.set(rel.normalizedUsername, rel);
    } else if (existing.timestamp == null && rel.timestamp != null) {
      map.set(rel.normalizedUsername, rel);
    }
  }
  return Array.from(map.values());
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
  const entries = Object.values(zip.files).filter((f) => !f.dir);

  onStage?.("scanning-files");

  const htmlFiles = entries.filter((e) => looksLikeHtmlFile(e.name));
  const jsonFiles = entries.filter((e) => /\.json$/i.test(e.name));
  const candidateFiles = entries.filter((e) => /\.(json|html?)$/i.test(e.name));

  const looksLikeHtmlExport = jsonFiles.length === 0 && htmlFiles.length > 0;

  const followerRelationships: Relationship[] = [];
  const followingRelationships: Relationship[] = [];
  const diagnostics: ParseDiagnostics = {
    followerFilesUsed: [],
    followingFilesUsed: [],
    ignoredFiles: [],
    ignoredFileCount: 0,
    warnings: [],
    coverage: null,
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
    let classification: ReturnType<typeof classifyFile>["classification"];

    if (isHtml) {
      classification = classifyFile(fileName, undefined).classification;
      if (classification === "followers" || classification === "following") {
        relationships = extractRelationshipsFromHtml(raw);
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
        relationships = extractRelationships(json);
      }
    }

    if (classification === "followers") {
      followerRelationships.push(...relationships);
      diagnostics.followerFilesUsed.push(fileName);
    } else if (classification === "following") {
      followingRelationships.push(...relationships);
      diagnostics.followingFilesUsed.push(fileName);
    } else {
      diagnostics.ignoredFiles.push(fileName);
      diagnostics.ignoredFileCount++;
    }
  }

  onStage?.("finding-following");
  onStage?.("normalizing");
  onStage?.("deduplicating");

  const followers = dedupe(followerRelationships);
  const following = dedupe(followingRelationships);

  onStage?.("done");

  return {
    followers,
    following,
    diagnostics,
    looksLikeHtmlExport,
  };
}
