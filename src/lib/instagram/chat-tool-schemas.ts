import { z } from "zod";

/**
 * Shared tool input schemas for the AI chat feature. Framework-agnostic (no
 * Dexie/browser imports) so the server route can use them to declare
 * client-side tools, while the actual execution (chat-tools.ts) stays
 * browser-only and reads from IndexedDB.
 */

export const matchModeSchema = z
  .enum(["contains", "startsWith", "endsWith"])
  .optional()
  .describe(
    "How `query` should match a username, case-insensitive. 'contains' (the default) matches the text anywhere in the username — use it for phrasing like \"usernames with a 3 in them\" or \"containing xyz\". 'startsWith' is REQUIRED for phrasing like \"usernames starting with a\" or \"that begin with the letter j\" — never use 'contains' for a starts-with request, since that would also match the letter appearing in the middle of a name. 'endsWith' is REQUIRED for phrasing like \"usernames ending in x\" or \"that end with 99\". Get this right: a strict starts-with/ends-with request must use the matching mode, not a plain substring search."
  );
export type MatchMode = z.infer<typeof matchModeSchema>;

export const paginatedListInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe(
      "Optional text to filter usernames by, case-insensitive. Pair with matchMode to control exactly how it matches (contains/startsWith/endsWith) — see matchMode's description for when each is required."
    ),
  matchMode: matchModeSchema,
  offset: z.number().int().min(0).optional().describe("How many matching results to skip. Defaults to 0."),
  after: z
    .string()
    .optional()
    .describe(
      "Internal pagination cursor: return results alphabetically after this exact normalized username instead of using offset. Not needed for normal use — offset is fine."
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .describe("Max results to return in this page (max 200). Defaults to 50."),
});
export type PaginatedListInput = z.infer<typeof paginatedListInputSchema>;

export const checkAccountInputSchema = z.object({
  username: z.string().describe("The Instagram username to look up, with or without an @."),
});
export type CheckAccountInput = z.infer<typeof checkAccountInputSchema>;

const includeProtectedField = z
  .boolean()
  .optional()
  .describe(
    "Set true only when the user explicitly asks to include protected accounts too (e.g. \"including protected ones\" or \"show me everyone, even protected accounts\"). Defaults to false/omitted, which hides every account the user has marked protected."
  );

export const doesNotFollowBackInputSchema = paginatedListInputSchema.extend({
  includeProtected: includeProtectedField,
});
export type DoesNotFollowBackInput = z.infer<typeof doesNotFollowBackInputSchema>;

export const listRecentUnfollowersInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().describe("Max events to return. Defaults to 50."),
  includeProtected: includeProtectedField,
});
export type ListRecentUnfollowersInput = z.infer<typeof listRecentUnfollowersInputSchema>;

export const protectAccountInputSchema = z.object({
  username: z.string().describe("The Instagram username to protect, with or without an @."),
  label: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .optional()
    .describe(
      "Optional short user-chosen tag for why this account is protected, e.g. \"verified\", \"brand/venue\", \"close friend\", or any custom label. Never invent or guess a label the user didn't give — leave it unset if they didn't specify one."
    ),
});
export type ProtectAccountInput = z.infer<typeof protectAccountInputSchema>;

export const unprotectAccountInputSchema = z.object({
  username: z.string().describe("The Instagram username to remove protection from, with or without an @."),
});
export type UnprotectAccountInput = z.infer<typeof unprotectAccountInputSchema>;

export const emptyInputSchema = z.object({});

export const csvListTypeSchema = z.enum([
  "nonMutualFollowers",
  "notFollowingBack",
  "mutuals",
  "lostFollowers",
  "newFollowers",
]);
export type CSVListType = z.infer<typeof csvListTypeSchema>;

export const exportListAsCSVInputSchema = z.object({
  listType: csvListTypeSchema.describe(
    "Which relationship list to export: nonMutualFollowers (people who follow the user but the user doesn't follow back), notFollowingBack (people the user follows who don't follow back), mutuals (follow each other), lostFollowers (followers lost between two snapshots), or newFollowers (followers gained between two snapshots)."
  ),
  snapshotId: z
    .string()
    .optional()
    .describe(
      "Which snapshot to read from for nonMutualFollowers, notFollowingBack, or mutuals. Defaults to the latest usable snapshot. Ignored for lostFollowers/newFollowers."
    ),
  fromSnapshotId: z
    .string()
    .optional()
    .describe(
      "For lostFollowers/newFollowers only: the earlier snapshot in the comparison pair. Must be paired with toSnapshotId. Defaults (when omitted) to the two most recent usable snapshots."
    ),
  toSnapshotId: z
    .string()
    .optional()
    .describe(
      "For lostFollowers/newFollowers only: the later snapshot in the comparison pair. Must be paired with fromSnapshotId. Defaults (when omitted) to the two most recent usable snapshots."
    ),
  includeProtected: includeProtectedField,
});
export type ExportListAsCSVInput = z.infer<typeof exportListAsCSVInputSchema>;

export const CHAT_TOOL_DESCRIPTIONS = {
  getAccountStats:
    "Get the current follower count, following count, mutuals count, doesn't-follow-back count, and you-don't-follow-back count from the user's latest imported Instagram snapshot.",
  listDoesNotFollowBack:
    "List accounts the user follows that don't follow them back (Following minus Followers), optionally filtered by username using query + matchMode (see matchMode for choosing contains vs startsWith vs endsWith correctly), paginated. Accounts the user has marked protected are excluded by default — pass includeProtected: true only if the user explicitly asks to see protected accounts too.",
  listMutuals:
    "List accounts that follow the user AND that the user follows back, optionally filtered by username using query + matchMode (see matchMode for choosing contains vs startsWith vs endsWith correctly), paginated.",
  listYouDontFollowBack:
    "List accounts that follow the user but the user doesn't follow back (Followers minus Following), optionally filtered by username using query + matchMode (see matchMode for choosing contains vs startsWith vs endsWith correctly), paginated.",
  checkAccount:
    "Check whether a specific username follows the user and/or the user follows that username, based on the latest snapshot. Also returns the Unix timestamp Meta recorded for each direction of the relationship (when available) — i.e. roughly when that follow happened — as followsYouSinceTimestamp / youFollowSinceTimestamp. Null when Meta didn't record one; never estimate or invent a date if it's null.",
  listRecentUnfollowers:
    "List people who used to follow the user but no longer do, detected by comparing consecutive imported snapshots over time. Requires at least two usable snapshots — if there's only one, this returns an explanation instead of data. Accounts the user has marked protected are excluded by default — pass includeProtected: true only if the user explicitly asks to see protected accounts too.",
  listSnapshots:
    "List every Instagram export snapshot the user has imported into Orbly, with date, follower/following counts, and data-completeness status.",
  getQueueStatus:
    "Get the count of accounts currently in the user's manual Unfollow Queue, broken down by pending/completed/skipped. Orbly never unfollows automatically — the queue is just a personal checklist.",
  exportListAsCSV:
    "Generate a downloadable CSV file (username, profile_url, detected_at) for one of the user's relationship lists — nonMutualFollowers, notFollowingBack, mutuals, lostFollowers, or newFollowers — and render a Download CSV button. Call this tool — do not say Orbly can't do it — any time the user asks for a spreadsheet, an Excel file, a Google Sheet, a CSV, a downloadable/exportable list, or 'a list I can download/open/import', or when a list is too long to usefully read in chat. A CSV is the correct output for every one of those phrasings: it opens directly in Excel, Google Sheets, and Numbers without any conversion, so there is no separate code path per format — always call this same tool regardless of which spreadsheet program the user named, and say in your reply that the downloaded CSV opens directly in Excel or Google Sheets. For a notFollowingBack export, accounts marked protected are excluded by default — pass includeProtected: true only if the user explicitly asks to include protected accounts. The file is generated and downloaded entirely in the user's browser — nothing is uploaded anywhere.",
  protectAccount:
    "Mark a specific Instagram username as protected, with an optional short user-chosen label (e.g. \"verified\", \"brand/venue\", \"close friend\", or any custom tag). Protected accounts are permanently excluded from doesNotFollowBack results, recent-unfollower results, the unfollow queue's suggestions, and CSV exports, across every future snapshot import, until explicitly unprotected. Call this when the user says things like \"don't ever suggest unfollowing @username\" or \"mark this account as protected\" or \"tag @username as a close friend.\" Orbly has no way to detect verification status, business/brand status, or any other account attribute from the export data — if the user asks to protect a whole category like \"verified accounts,\" do not claim to auto-detect them; instead ask them to name the specific usernames, or offer to protect them one at a time as they come up in conversation.",
  unprotectAccount:
    "Remove protection from a username, making it eligible again for unfollow suggestions, the unfollow queue, and CSV exports. Call this when the user says something like \"unprotect @username\" or \"stop protecting @username\" or \"I don't need @username protected anymore.\"",
  listProtectedAccounts:
    "List every account the user has marked protected, with its label (if any) and the date it was protected. Call this when the user asks things like \"who have I protected\" or \"show me my protected accounts.\"",
} as const;
