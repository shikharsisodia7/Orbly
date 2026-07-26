/**
 * Username normalization used everywhere comparisons happen.
 * The normalized form is the only value ever used for Set operations;
 * the display form is preserved separately for the UI.
 */

const VALID_USERNAME = /^[a-z0-9._]{1,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isPlausibleUsername(normalized: string): boolean {
  if (!normalized) return false;
  if (!VALID_USERNAME.test(normalized)) return false;
  // Instagram usernames can't be all periods/underscores.
  if (!/[a-z0-9]/.test(normalized)) return false;
  return true;
}

/**
 * Derives a username from an instagram.com profile URL, e.g.
 * "https://www.instagram.com/johnsmith/" -> "johnsmith"
 */
export function usernameFromProfileUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]{1,30})\/?/i);
  if (!match) return null;
  const candidate = normalizeUsername(match[1]);
  return isPlausibleUsername(candidate) ? candidate : null;
}

export function buildProfileUrl(normalizedUsername: string): string {
  return `https://www.instagram.com/${normalizedUsername}/`;
}
