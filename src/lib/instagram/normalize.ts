/**
 * Username normalization used everywhere comparisons happen.
 * The normalized form is the only value ever used for Set operations;
 * the display form is preserved separately for the UI.
 */

const VALID_USERNAME = /^[a-z0-9._]{1,30}$/;

/**
 * Meta replaces the username of a deleted/deactivated account with a
 * synthetic placeholder when generating an export — observed as both
 * "__deleted__<hash>" (following.json) and "deleted<hash>" (followers
 * files). These aren't real accounts: there's nothing to view, follow, or
 * unfollow, and their profile links always 404. Treated as unparseable so
 * they never enter any relationship set, list, or count.
 */
const DELETED_ACCOUNT_PLACEHOLDER = /^_{0,2}deleted/i;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isPlausibleUsername(normalized: string): boolean {
  if (!normalized) return false;
  if (!VALID_USERNAME.test(normalized)) return false;
  // Instagram usernames can't be all periods/underscores.
  if (!/[a-z0-9]/.test(normalized)) return false;
  if (DELETED_ACCOUNT_PLACEHOLDER.test(normalized)) return false;
  return true;
}

/**
 * Derives a username from an instagram.com profile URL, e.g.
 * "https://www.instagram.com/johnsmith/" -> "johnsmith". Also handles the
 * "_u/" redirect-style links Meta's newer following.json export uses
 * (e.g. "https://www.instagram.com/_u/johnsmith"), where the real username
 * is the segment AFTER "_u/", not "_u" itself.
 */
export function usernameFromProfileUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:_u\/)?([a-zA-Z0-9._]{1,30})\/?/i);
  if (!match) return null;
  const candidate = normalizeUsername(match[1]);
  return isPlausibleUsername(candidate) ? candidate : null;
}

export function buildProfileUrl(normalizedUsername: string): string {
  return `https://www.instagram.com/${normalizedUsername}/`;
}
