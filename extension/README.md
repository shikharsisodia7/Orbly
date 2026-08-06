# Orbly Companion (browser extension)

A manual, on-demand companion to the Orbly web app. It reads data already
rendered on Instagram pages you're actively looking at, and lets you sync it
into the same local database the Orbly web app uses — nothing more.

## What it deliberately does NOT do

- **No background activity.** There is no timer, interval, or polling loop
  anywhere in this extension. Every DOM read happens in direct response to
  you clicking a button in the popup.
- **No login automation.** It never enters your username/password, and never
  stores or transmits your Instagram credentials. It only reads pages you're
  already signed into and browsing yourself.
- **No write actions.** It cannot follow, unfollow, like, or comment. It is
  read-only, full stop.
- **No real-time/push monitoring.** It will not notify you the instant
  someone unfollows you — that would require checking Instagram
  automatically in the background, which this project intentionally avoids
  (see the main repo's `docs/CASE_STUDY.md` for why). To see what's changed,
  open Instagram and capture a fresh list yourself.
- **No bulk bio scraping.** Bios are captured one account at a time, only
  when you're on that exact profile page and click "Look up this account."
  It will never fetch bios for your whole follower/following list.

## How it works

1. **Capture a list.** Open your own `instagram.com/<you>/followers/` or
   `/following/` page, scroll so everyone you want is loaded, open the
   extension popup, and click "Capture." The content script reads the
   profile links already rendered in that dialog — it does not scroll or
   fetch anything for you.
2. **Capture both lists**, one visit each. The popup tracks progress across
   popup opens/closes (stored in `chrome.storage.local`, which never leaves
   your device).
3. **Sync to Orbly.** Once both are captured, click "Sync to Orbly." The
   popup opens (or focuses) a tab on Orbly's `/app/extension-sync` page and
   hands off the captured data via a same-origin `window.postMessage` —
   Orbly's own page code writes it into the exact same IndexedDB the file
   importer uses, going through the exact same deleted/deactivated-account
   filtering.
4. **Look up one account.** On any profile page, click "Look up this
   account" to read its bio and check whether it's still available. From
   there you can save the bio and/or add a bio-based exclusion rule in the
   Orbly chat.

## Installing it (unpacked — this isn't published to the Chrome Web Store)

1. Open `chrome://extensions`.
2. Turn on "Developer mode" (top right).
3. Click "Load unpacked" and select this `extension/` folder.
4. Pin the Orbly Companion icon to your toolbar for easy access.

## Known limitation: Instagram's markup changes

Instagram doesn't publish a stable DOM structure, and its class names are
auto-generated and change frequently. `content-scripts/instagram.js`
deliberately avoids relying on those class names — it uses structural
signals instead (`role="dialog"` for the followers/following modal,
`<header>` for the profile bio) that are more resilient, but not immune to a
redesign. If a capture or lookup ever returns nothing, that's the most
likely cause; the popup will say so plainly rather than pretending it
worked. If that happens, the selectors in `instagram.js` are the place to
look — they're deliberately written as small, isolated functions
(`scrapeVisibleList`, `scrapeBio`, `detectStatus`) so they're easy to update
independently.

## Privacy

Everything captured stays in your own browser's local storage — the
extension's own `chrome.storage.local` for in-progress captures, and Orbly's
IndexedDB (in your browser, at Orbly's origin) once synced. Nothing is ever
sent to a third-party server. The only network requests this extension makes
are: none. It only reads pages your browser already loaded because you
navigated there, and relays already-captured data to a page on Orbly's own
origin via `window.postMessage` — there are no `fetch`/`XMLHttpRequest`
calls anywhere in this codebase.
