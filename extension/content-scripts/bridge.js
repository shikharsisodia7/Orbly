/**
 * Orbly Companion — web app bridge content script.
 *
 * Runs ONLY on Orbly's own /app/extension-sync page (per manifest.json's
 * matches). Two jobs, one in each direction:
 *
 * 1. Extension -> page: relay a payload the popup already staged in
 *    chrome.storage.local (because the user clicked a button) into the page
 *    via window.postMessage, so the page (its own origin, its own
 *    IndexedDB) can write it using the exact same validated code path a
 *    normal file import uses.
 * 2. Page -> extension: for a "Check Now" request specifically, the page
 *    computes the diff and posts a reply back out; this relays that reply
 *    to the extension via chrome.runtime.sendMessage so the popup — which
 *    has no direct access to the page's IndexedDB — can show the result
 *    without the user ever needing to look at this tab.
 *
 * This script never reaches out anywhere on its own; every message it
 * relays originated from either a user click (popup -> storage) or Orbly's
 * own trusted page code responding to one.
 */

const STORAGE_KEY = "orblyPendingPayload";

function relayToPage(payload) {
  window.postMessage({ source: "orbly-extension", payload }, window.location.origin);
}

chrome.storage.local.get(STORAGE_KEY, (result) => {
  const pending = result[STORAGE_KEY];
  if (pending) {
    relayToPage(pending);
    chrome.storage.local.remove(STORAGE_KEY);
  }
});

// Covers the case where this tab was already open (and this script already
// ran) before the popup wrote the payload — chrome.storage.onChanged fires
// live, so the sync still lands without the user needing to reload the tab.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]?.newValue) return;
  relayToPage(changes[STORAGE_KEY].newValue);
  chrome.storage.local.remove(STORAGE_KEY);
});

// Reverse direction: the page replying to a "Check Now" request.
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.source !== window) return; // only ever from this exact page, not an embedded frame
  const data = event.data;
  if (!data || data.source !== "orbly-page" || data.type !== "orbly-check-result") return;
  chrome.runtime.sendMessage({ type: "ORBLY_CHECK_RESULT", requestId: data.requestId, result: data.result });
});
