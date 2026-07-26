// One-off generator for synthetic fixture data. Not imported by tests or app code.
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");

const baseTs = 1690000000;

function entry(username, i, opts = {}) {
  const e = {
    href: opts.noHref ? undefined : `https://www.instagram.com/${username}/`,
    value: opts.noValue ? undefined : username,
    timestamp: opts.noTimestamp ? undefined : baseTs + i * 3600,
  };
  if (e.href === undefined) delete e.href;
  if (e.value === undefined) delete e.value;
  if (e.timestamp === undefined) delete e.timestamp;
  return e;
}

function record(username, i, opts = {}) {
  return {
    title: "",
    media_list_data: [],
    string_list_data: [entry(username, i, opts)],
  };
}

const pad = (n) => String(n).padStart(3, "0");

// followers_1.json: u001..u020, legacy plain-array format
const followers1 = [];
for (let i = 1; i <= 20; i++) {
  followers1.push(record(`u${pad(i)}_synthetic`, i));
}
// one entry with no timestamp to test optional timestamp handling
followers1.push(record("u021_synthetic", 21, { noTimestamp: true }));

// followers_2.json: u018-u020 overlap with file 1 (cross-file dedupe), u022-u035 are new,
// u021 is deliberately NOT repeated here so its no-timestamp entry from file 1 survives.
const followers2 = [];
for (let i = 18; i <= 20; i++) {
  followers2.push(record(`u${pad(i)}_synthetic`, i));
}
for (let i = 22; i <= 35; i++) {
  followers2.push(record(`u${pad(i)}_synthetic`, i));
}
followers2.push(record("u036_hrefonly", 36, { noValue: true }));

// following.json: newer wrapped format. u001-u010 (mutual with followers) + v001-v020 (following-only)
const followingInner = [];
for (let i = 1; i <= 10; i++) {
  followingInner.push(record(`u${pad(i)}_synthetic`, i));
}
for (let i = 1; i <= 20; i++) {
  followingInner.push(record(`v${pad(i)}_synthetic`, i + 100));
}
const following = { relationships_following: followingInner };

// Decoy files that must NEVER be treated as followers/following
const closeFriends = [record("u001_synthetic", 1), record("decoyclose_synthetic", 999)];
const blockedProfiles = [record("decoyblocked_synthetic", 998)];
const followRequestsSent = [record("decoyrequest_synthetic", 997)];
const recentlyUnfollowed = [record("decoyunfollowed_synthetic", 996)];

// Unrelated JSON that must not crash the parser
const profileInfo = {
  profile_user: [
    {
      string_map_data: {
        Name: { value: "Synthetic Test User" },
        Email: { value: "not-a-real-email@example.com" },
      },
    },
  ],
};

const files = {
  "followers_1.json": followers1,
  "followers_2.json": followers2,
  "following.json": following,
  "close_friends.json": closeFriends,
  "blocked_profiles.json": blockedProfiles,
  "follow_requests_you've_sent.json": followRequestsSent,
  "recently_unfollowed_profiles.json": recentlyUnfollowed,
  "profile_info.json": profileInfo,
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(content, null, 2));
}

console.log("Fixtures written to", dir);
