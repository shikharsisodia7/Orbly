import type { FileClassification } from "./types";

/**
 * Filenames that LOOK like they might be follow-related but represent
 * something else entirely. These must never be treated as followers/following.
 */
const EXCLUDE_PATTERNS: RegExp[] = [
  /close_friend/i,
  /block/i,
  /request/i, // follow_requests_you've_sent/received, pending_follow_requests
  /recently_unfollowed/i,
  /removed_suggestion/i,
  /restrict/i,
  /mute/i,
  /dismiss/i,
  /suggested/i,
  /pending/i,
  /hide_story/i,
  /bestie/i,
  /recent_follow/i,
];

const FOLLOWERS_FILENAME = /(^|[\\/])followers(_\d+)?\.(json|html?)$/i;
const FOLLOWING_FILENAME = /(^|[\\/])following(_\d+)?\.(json|html?)$/i;

export interface ShapeCheck {
  looksLikeRelationshipArray: boolean;
  hasRelationshipsFollowingKey: boolean;
}

/**
 * Defensive structural check: does this JSON look like it contains
 * Instagram-style relationship records anywhere in its tree?
 */
export function inspectShape(json: unknown): ShapeCheck {
  let looksLikeRelationshipArray = false;
  let hasRelationshipsFollowingKey = false;

  const visit = (node: unknown, depth: number) => {
    if (depth > 6 || node == null) return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item, depth + 1);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.string_list_data)) {
        looksLikeRelationshipArray = true;
      }
      if ("relationships_following" in obj) {
        hasRelationshipsFollowingKey = true;
      }
      for (const value of Object.values(obj)) visit(value, depth + 1);
    }
  };

  visit(json, 0);
  return { looksLikeRelationshipArray, hasRelationshipsFollowingKey };
}

export function classifyFile(
  fileName: string,
  json: unknown
): { classification: FileClassification; reason: string } {
  const lower = fileName.toLowerCase();

  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(lower)) {
      return { classification: "ignored", reason: "excluded by filename" };
    }
  }

  const shape = inspectShape(json);

  if (shape.hasRelationshipsFollowingKey) {
    return { classification: "following", reason: "relationships_following key found" };
  }

  if (FOLLOWERS_FILENAME.test(lower)) {
    return shape.looksLikeRelationshipArray
      ? { classification: "followers", reason: "filename + shape match" }
      : { classification: "followers", reason: "filename match (empty or unusual shape)" };
  }

  if (FOLLOWING_FILENAME.test(lower)) {
    return shape.looksLikeRelationshipArray
      ? { classification: "following", reason: "filename + shape match" }
      : { classification: "following", reason: "filename match (empty or unusual shape)" };
  }

  if (shape.looksLikeRelationshipArray) {
    if (/follower/i.test(lower)) {
      return { classification: "followers", reason: "content shape + filename hint" };
    }
    if (/following/i.test(lower)) {
      return { classification: "following", reason: "content shape + filename hint" };
    }
  }

  return { classification: "ignored", reason: "unrecognized filename and structure" };
}

export function looksLikeHtmlFile(fileName: string): boolean {
  return /\.html?$/i.test(fileName);
}
