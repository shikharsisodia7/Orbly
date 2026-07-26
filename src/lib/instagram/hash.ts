import type { Relationship } from "./types";

/**
 * Builds a deterministic canonical representation of a dataset so that
 * two exports containing identical relationship data hash identically,
 * even if the underlying ZIP binary differs (different export timestamp,
 * file ordering, compression, etc).
 */
export function canonicalDatasetString(
  followers: Relationship[],
  following: Relationship[]
): string {
  const followerNames = followers
    .map((r) => r.normalizedUsername)
    .sort((a, b) => a.localeCompare(b));
  const followingNames = following
    .map((r) => r.normalizedUsername)
    .sort((a, b) => a.localeCompare(b));

  return JSON.stringify({
    followers: followerNames,
    following: followingNames,
  });
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("crypto.subtle is not available in this environment");
  }
  return subtle;
}

export async function hashDataset(
  followers: Relationship[],
  following: Relationship[]
): Promise<string> {
  const canonical = canonicalDatasetString(followers, following);
  const encoded = new TextEncoder().encode(canonical);
  const digest = await getSubtleCrypto().digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
