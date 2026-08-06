/**
 * Orbly Companion — Instagram content script.
 *
 * Runs on instagram.com pages. Every function here executes ONLY in direct
 * response to a message from the extension's own popup, which itself only
 * sends a message when the user clicks a button — there is no timer,
 * interval, MutationObserver-driven polling, or any other code path that
 * runs on its own. Nothing here logs in, follows, unfollows, likes, or
 * comments; it only reads text and links already rendered on the page the
 * user is already looking at.
 *
 * Selectors deliberately avoid Instagram's auto-generated CSS class names
 * (they're obfuscated and change often); instead this relies on structural
 * facts — role="dialog" for the followers/following modal, <header> for the
 * profile bio — that are far less likely to change across redesigns. Even
 * so, Instagram's markup does shift over time, so every function here
 * returns null/empty on failure rather than guessing — see the popup UI for
 * how that's surfaced honestly to the user instead of silently failing.
 */

const PROFILE_LINK_RE = /^\/([a-zA-Z0-9._]{1,30})\/?$/;
const EXCLUDED_PATH_SEGMENTS = new Set([
  "p", "reel", "reels", "explore", "direct", "stories", "accounts", "tv", "about", "legal",
]);

function hrefToUsername(href) {
  try {
    const url = new URL(href, location.origin);
    const match = url.pathname.match(PROFILE_LINK_RE);
    if (!match) return null;
    const candidate = match[1];
    if (EXCLUDED_PATH_SEGMENTS.has(candidate.toLowerCase())) return null;
    return candidate;
  } catch {
    return null;
  }
}

function getPageContext() {
  const path = location.pathname;
  const followersMatch = path.match(/^\/([a-zA-Z0-9._]{1,30})\/followers\/?$/);
  if (followersMatch) return { pageType: "followers-list", username: followersMatch[1] };
  const followingMatch = path.match(/^\/([a-zA-Z0-9._]{1,30})\/following\/?$/);
  if (followingMatch) return { pageType: "following-list", username: followingMatch[1] };
  const profileMatch = path.match(/^\/([a-zA-Z0-9._]{1,30})\/?$/);
  if (profileMatch && !EXCLUDED_PATH_SEGMENTS.has(profileMatch[1].toLowerCase())) {
    return { pageType: "profile", username: profileMatch[1] };
  }
  return { pageType: "other", username: null };
}

/** Reads whatever profile links are currently rendered in the open followers/following dialog — a single, on-demand DOM read, not a scroll-and-collect loop. */
function scrapeVisibleList() {
  const dialog = document.querySelector('div[role="dialog"]');
  const root = dialog ?? document.body;
  const anchors = Array.from(root.querySelectorAll("a[href]"));
  const seen = new Map();
  for (const a of anchors) {
    const username = hrefToUsername(a.getAttribute("href") || "");
    if (!username) continue;
    const text = a.textContent?.trim();
    const existing = seen.get(username);
    if (!existing || (text && !existing.username)) {
      seen.set(username, { username: text || username, href: a.href });
    }
  }
  return Array.from(seen.values());
}

/** Best-effort bio extraction: the longest plain-text run in <header> that isn't the username or a stat count. Returns null rather than guessing wrong. */
function scrapeBio() {
  const header = document.querySelector("header");
  if (!header) return null;
  const username = getPageContext().username;
  const candidates = Array.from(header.querySelectorAll("span, div"))
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent?.trim() ?? "")
    .filter((text) => text.length > 3 && text !== username && !/^[\d,.]+$/.test(text));
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.length - a.length)[0];
}

function detectStatus() {
  const bodyText = document.body.innerText || "";
  if (/sorry, this page isn'?t available/i.test(bodyText)) return "not_found";
  if (/this account is private/i.test(bodyText)) return "private";
  return "active";
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return undefined;
  switch (message.type) {
    case "ORBLY_GET_PAGE_CONTEXT":
      sendResponse(getPageContext());
      return true;
    case "ORBLY_SCRAPE_LIST":
      sendResponse({ accounts: scrapeVisibleList() });
      return true;
    case "ORBLY_SCRAPE_PROFILE":
      sendResponse({ username: getPageContext().username, bio: scrapeBio(), status: detectStatus() });
      return true;
    default:
      return undefined;
  }
});
