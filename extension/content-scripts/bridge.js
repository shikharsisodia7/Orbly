/**
 * Orbly Companion — web app bridge content script.
 *
 * Runs ONLY on Orbly's own /app/extension-sync page (per manifest.json's
 * matches). Its entire job is relaying a payload the popup already staged
 * in chrome.storage.local — because the user clicked "Sync to Orbly" — into
 * the page itself via window.postMessage, so the page (running in its own
 * origin, with its own IndexedDB) can write it using the exact same
 * validated code path a normal file import uses. This script never
 * reaches out anywhere on its own; it only reacts to storage the popup
 * already wrote in direct response to a click.
 */

const STORAGE_KEY = "orblyPendingPayload";

function relay(payload) {
  window.postMessage({ source: "orbly-extension", payload }, window.location.origin);
}

chrome.storage.local.get(STORAGE_KEY, (result) => {
  const pending = result[STORAGE_KEY];
  if (pending) {
    relay(pending);
    chrome.storage.local.remove(STORAGE_KEY);
  }
});

// Covers the case where this tab was already open (and this script already
// ran) before the popup wrote the payload — chrome.storage.onChanged fires
// live, so the sync still lands without the user needing to reload the tab.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]?.newValue) return;
  relay(changes[STORAGE_KEY].newValue);
  chrome.storage.local.remove(STORAGE_KEY);
});
