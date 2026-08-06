/**
 * Orbly Companion — popup script.
 *
 * Everything in this file runs only while the popup is open, and only in
 * direct response to the user clicking something in it. There is no
 * setInterval/setTimeout polling loop anywhere here, and no request is ever
 * sent to Instagram except the one-shot chrome.tabs.sendMessage calls below,
 * each of which is triggered by an explicit button click and reads only
 * whatever the content script finds already rendered on the page.
 */

const ORBLY_SYNC_URLS = [
  "https://orbly-drab.vercel.app/app/extension-sync",
  "http://localhost:3000/app/extension-sync",
];
const DEFAULT_SYNC_URL = ORBLY_SYNC_URLS[0];

const SESSION_KEY = "orblyCaptureSession";
const PENDING_PAYLOAD_KEY = "orblyPendingPayload";
const ACTION_COOLDOWN_MS = 2000;

let lastActionAt = 0;
function actionAllowed() {
  const now = Date.now();
  if (now - lastActionAt < ACTION_COOLDOWN_MS) return false;
  lastActionAt = now;
  return true;
}

const content = document.getElementById("content");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null; // content script not present on this tab (not instagram.com, or page not yet loaded)
  }
}

async function getSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  return (
    result[SESSION_KEY] ?? {
      followers: null,
      following: null,
      sourceUsername: null,
      capturedAt: null,
    }
  );
}

async function setSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

async function render() {
  content.innerHTML = "";
  content.appendChild(el(`<div class="loading">Checking this tab…</div>`));

  const tab = await getActiveTab();
  const isInstagram = tab?.url?.startsWith("https://www.instagram.com/");
  const context = isInstagram ? await sendToTab(tab.id, { type: "ORBLY_GET_PAGE_CONTEXT" }) : null;

  content.innerHTML = "";

  if (!isInstagram || !context) {
    content.appendChild(renderOtherState());
    return;
  }

  if (context.pageType === "followers-list" || context.pageType === "following-list") {
    content.appendChild(await renderListState(tab.id, context));
    return;
  }

  if (context.pageType === "profile") {
    content.appendChild(renderProfileState(tab.id, context));
    return;
  }

  content.appendChild(renderOtherState());
}

function renderOtherState() {
  const card = el(`
    <div class="card">
      <p class="label">Open Instagram to get started</p>
      <p class="hint">
        Go to your own followers or following list, or any profile, then reopen this popup.
        Nothing here does anything until you're actually looking at one of those pages.
      </p>
      <button class="btn btn-secondary" style="margin-top:10px" id="open-ig">Open Instagram</button>
    </div>
  `);
  card.querySelector("#open-ig").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.instagram.com/" });
  });
  return card;
}

async function renderListState(tabId, context) {
  const session = await getSession();
  const listKey = context.pageType === "followers-list" ? "followers" : "following";
  const listLabel = listKey === "followers" ? "Followers" : "Following";

  const wrapper = el(`<div></div>`);

  wrapper.appendChild(
    context.pageType === "followers-list" ? renderCheckNowCard(tabId) : renderCheckNowNudge()
  );

  const captureCard = el(`
    <div class="card">
      <div class="row">
        <p class="label">Capture ${listLabel.toLowerCase()} — @${context.username}</p>
      </div>
      <p class="hint">
        Scroll this list on Instagram so everyone you want is actually loaded on the page, then
        capture it. This reads what's already rendered — it doesn't scroll or fetch for you.
      </p>
      <button class="btn btn-primary" style="margin-top:10px" id="capture-btn">
        Capture ${listLabel.toLowerCase()} shown on this page
      </button>
      <div class="status-line" id="capture-status"></div>
    </div>
  `);

  const captureBtn = captureCard.querySelector("#capture-btn");
  const statusLine = captureCard.querySelector("#capture-status");

  captureBtn.addEventListener("click", async () => {
    if (!actionAllowed()) return;
    captureBtn.disabled = true;
    statusLine.textContent = "Reading the page…";
    const result = await sendToTab(tabId, { type: "ORBLY_SCRAPE_LIST" });
    captureBtn.disabled = false;
    if (!result || !Array.isArray(result.accounts)) {
      statusLine.innerHTML = `<span class="badge badge-rose">Couldn't read this list — try scrolling it into view first.</span>`;
      return;
    }
    const updated = await getSession();
    updated[listKey] = result.accounts;
    updated.sourceUsername = context.username;
    updated.capturedAt = new Date().toISOString();
    await setSession(updated);
    statusLine.innerHTML = `<span class="badge badge-green">Captured ${result.accounts.length} accounts</span>`;
    renderProgress(wrapper, updated);
  });

  wrapper.appendChild(captureCard);
  renderProgress(wrapper, session);
  return wrapper;
}

/**
 * The fast path: one click, reads the followers list already rendered on
 * this page, sends it for a diff against whatever Orbly already has, and
 * shows the result right here in the popup — the user never has to look at
 * the Orbly tab, which opens in the background purely to run the
 * comparison (it has the IndexedDB access this popup doesn't).
 */
function renderCheckNowCard(tabId) {
  const card = el(`
    <div class="card">
      <p class="label">Check for unfollowers now</p>
      <p class="hint">Reads this followers list and compares it to your last check — one click.</p>
      <button class="btn btn-gradient" style="margin-top:10px" id="checknow-btn">Check Now</button>
      <div class="status-line" id="checknow-status"></div>
      <div id="checknow-result"></div>
    </div>
  `);

  const btn = card.querySelector("#checknow-btn");
  const statusLine = card.querySelector("#checknow-status");
  const resultBox = card.querySelector("#checknow-result");

  btn.addEventListener("click", async () => {
    if (!actionAllowed()) return;
    btn.disabled = true;
    resultBox.innerHTML = "";
    statusLine.textContent = "Reading your followers…";

    const scraped = await sendToTab(tabId, { type: "ORBLY_SCRAPE_LIST" });
    if (!scraped || !Array.isArray(scraped.accounts)) {
      statusLine.innerHTML = `<span class="badge badge-rose">Couldn't read this list — try scrolling it into view first.</span>`;
      btn.disabled = false;
      return;
    }

    statusLine.textContent = "Comparing with Orbly…";
    const requestId = crypto.randomUUID();
    await chrome.storage.local.set({
      [PENDING_PAYLOAD_KEY]: {
        type: "orbly-extension-check-request",
        version: 1,
        requestId,
        followers: scraped.accounts,
      },
    });
    await ensureOrblySyncTabOpen();
    const result = await waitForCheckResult(requestId, 20000);
    btn.disabled = false;

    if (!result) {
      statusLine.innerHTML = `<span class="badge badge-rose">No response from Orbly — make sure orbly-drab.vercel.app can load, then try again.</span>`;
      return;
    }
    statusLine.textContent = "";
    renderCheckResult(resultBox, result);
  });

  return card;
}

function renderCheckNowNudge() {
  const card = el(`
    <div class="card">
      <p class="label">Check for unfollowers now</p>
      <p class="hint">This checks your followers, not following — open your followers list to check.</p>
    </div>
  `);
  return card;
}

/** Resolves with the check result once the extension background/runtime receives it, or null after timing out. */
function waitForCheckResult(requestId, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      chrome.runtime.onMessage.removeListener(listener);
      resolve(null);
    }, timeoutMs);

    function listener(message) {
      if (settled || message?.type !== "ORBLY_CHECK_RESULT" || message.requestId !== requestId) return;
      settled = true;
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
      resolve(message.result);
    }

    chrome.runtime.onMessage.addListener(listener);
  });
}

function renderCheckResult(container, result) {
  const renderList = (items) =>
    items.length
      ? items
          .map(
            (item) =>
              `<a class="status-line" style="justify-content:flex-start" href="${item.profileUrl}" target="_blank" rel="noopener noreferrer">@${escapeHtml(item.username)}</a>`
          )
          .join("")
      : `<p class="hint">None.</p>`;

  const el2 = document.createElement("div");
  el2.className = "card";
  el2.style.marginTop = "10px";
  el2.innerHTML = `
    <p class="label">
      ${
        result.isFirstCheck
          ? "First check — baseline recorded"
          : "Compared to " + new Date(result.previousCheckedAt).toLocaleString()
      }
    </p>
    ${result.excludedCount > 0 ? `<p class="hint">${result.excludedCount} unfollow${result.excludedCount === 1 ? "" : "s"} hidden by protection/exclusion rules.</p>` : ""}
    <p class="label" style="margin-top:8px">Unfollowed you (${result.unfollowed.length})</p>
    ${renderList(result.unfollowed)}
    <p class="label" style="margin-top:8px">New followers (${result.newFollowers.length})</p>
    ${renderList(result.newFollowers)}
  `;
  container.innerHTML = "";
  container.appendChild(el2);
}

/** Opens the Orbly tab in the background (if not already open) so the popup keeps the user's attention — Check Now never needs them to look away from Instagram. */
async function ensureOrblySyncTabOpen() {
  const allTabs = await chrome.tabs.query({});
  const existing = allTabs.find((t) => t.url && ORBLY_SYNC_URLS.some((u) => t.url.startsWith(u)));
  if (existing) return existing;
  return chrome.tabs.create({ url: DEFAULT_SYNC_URL, active: false });
}

function renderProgress(wrapper, session) {
  const existing = wrapper.querySelector("#progress-card");
  if (existing) existing.remove();

  const followersDone = Array.isArray(session.followers);
  const followingDone = Array.isArray(session.following);
  const bothDone = followersDone && followingDone;

  const card = el(`
    <div class="card" id="progress-card">
      <p class="label">Ready to sync</p>
      <div class="progress">
        <div class="chip ${followersDone ? "done" : ""}">
          Followers
          <span class="count">${followersDone ? session.followers.length : "—"}</span>
        </div>
        <div class="chip ${followingDone ? "done" : ""}">
          Following
          <span class="count">${followingDone ? session.following.length : "—"}</span>
        </div>
      </div>
      <p class="hint" style="margin-top:8px">
        ${bothDone ? "Both lists captured — ready to sync." : "Capture both your followers and following (visit each page) before syncing, so Orbly gets a complete snapshot."}
      </p>
      <button class="btn btn-gradient" style="margin-top:10px" id="sync-btn" ${bothDone ? "" : "disabled"}>
        Sync to Orbly
      </button>
      <div class="status-line" id="sync-status"></div>
    </div>
  `);

  card.querySelector("#sync-btn").addEventListener("click", async () => {
    if (!actionAllowed()) return;
    const btn = card.querySelector("#sync-btn");
    const status = card.querySelector("#sync-status");
    btn.disabled = true;
    status.textContent = "Opening Orbly…";
    const current = await getSession();
    await chrome.storage.local.set({
      [PENDING_PAYLOAD_KEY]: {
        type: "orbly-extension-sync",
        version: 1,
        capturedAt: current.capturedAt ?? new Date().toISOString(),
        followers: current.followers ?? [],
        following: current.following ?? [],
        sourceUsername: current.sourceUsername ?? null,
      },
    });
    await openOrFocusOrblySync();
    await clearSession();
    status.innerHTML = `<span class="badge badge-green">Sent — check the Orbly tab</span>`;
  });

  wrapper.appendChild(card);
}

function renderProfileState(tabId, context) {
  const wrapper = el(`
    <div class="card">
      <p class="label">Look up @${context.username}</p>
      <p class="hint">Reads the bio and checks whether this profile is available — a single read, right now.</p>
      <button class="btn btn-primary" style="margin-top:10px" id="lookup-btn">Look up this account</button>
      <div id="lookup-result"></div>
    </div>
  `);

  const lookupBtn = wrapper.querySelector("#lookup-btn");
  const resultBox = wrapper.querySelector("#lookup-result");

  lookupBtn.addEventListener("click", async () => {
    if (!actionAllowed()) return;
    lookupBtn.disabled = true;
    resultBox.innerHTML = `<div class="status-line">Reading the profile…</div>`;
    const result = await sendToTab(tabId, { type: "ORBLY_SCRAPE_PROFILE" });
    lookupBtn.disabled = false;
    if (!result) {
      resultBox.innerHTML = `<div class="status-line"><span class="badge badge-rose">Couldn't read this profile.</span></div>`;
      return;
    }

    const statusBadge =
      result.status === "not_found"
        ? `<span class="badge badge-rose">No longer available</span>`
        : result.status === "private"
          ? `<span class="badge badge-neutral">Private</span>`
          : `<span class="badge badge-green">Active</span>`;

    resultBox.innerHTML = `
      <div class="status-line">${statusBadge}</div>
      ${result.bio ? `<div class="bio-text">${escapeHtml(result.bio)}</div>` : `<p class="hint">No bio text found.</p>`}
      <button class="btn btn-secondary" id="save-btn">Save to Orbly</button>
      <div class="status-line" id="save-status"></div>
    `;

    resultBox.querySelector("#save-btn").addEventListener("click", async () => {
      const saveBtn = resultBox.querySelector("#save-btn");
      const saveStatus = resultBox.querySelector("#save-status");
      saveBtn.disabled = true;
      saveStatus.textContent = "Opening Orbly…";
      const now = new Date().toISOString();
      if (result.bio) {
        await sendPayloadToOrbly({
          type: "orbly-extension-bio",
          version: 1,
          username: result.username,
          bio: result.bio,
          capturedAt: now,
        });
      }
      await sendPayloadToOrbly({
        type: "orbly-extension-status",
        version: 1,
        username: result.username,
        status: result.status,
        capturedAt: now,
      });
      saveStatus.innerHTML = `<span class="badge badge-green">Sent — check the Orbly tab</span>`;
    });
  });

  return wrapper;
}

async function sendPayloadToOrbly(payload) {
  await chrome.storage.local.set({ [PENDING_PAYLOAD_KEY]: payload });
  await openOrFocusOrblySync();
}

async function openOrFocusOrblySync() {
  const allTabs = await chrome.tabs.query({});
  const existing = allTabs.find((t) => t.url && ORBLY_SYNC_URLS.some((u) => t.url.startsWith(u)));
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url: DEFAULT_SYNC_URL });
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

render();
