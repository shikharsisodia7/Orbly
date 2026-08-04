import { z } from "zod";

/**
 * Shared tool input schemas for the AI chat feature. Framework-agnostic (no
 * Dexie/browser imports) so the server route can use them to declare
 * client-side tools, while the actual execution (chat-tools.ts) stays
 * browser-only and reads from IndexedDB.
 */

export const paginatedListInputSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Optional substring to filter usernames by, case-insensitive."),
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

export const listRecentUnfollowersInputSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().describe("Max events to return. Defaults to 50."),
});
export type ListRecentUnfollowersInput = z.infer<typeof listRecentUnfollowersInputSchema>;

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
});
export type ExportListAsCSVInput = z.infer<typeof exportListAsCSVInputSchema>;

export const CHAT_TOOL_DESCRIPTIONS = {
  getAccountStats:
    "Get the current follower count, following count, mutuals count, doesn't-follow-back count, and you-don't-follow-back count from the user's latest imported Instagram snapshot.",
  listDoesNotFollowBack:
    "List accounts the user follows that don't follow them back (Following minus Followers), optionally filtered by a username substring, paginated.",
  listMutuals:
    "List accounts that follow the user AND that the user follows back, optionally filtered by a username substring, paginated.",
  listYouDontFollowBack:
    "List accounts that follow the user but the user doesn't follow back (Followers minus Following), optionally filtered by a username substring, paginated.",
  checkAccount:
    "Check whether a specific username follows the user and/or the user follows that username, based on the latest snapshot. Also returns the Unix timestamp Meta recorded for each direction of the relationship (when available) — i.e. roughly when that follow happened — as followsYouSinceTimestamp / youFollowSinceTimestamp. Null when Meta didn't record one; never estimate or invent a date if it's null.",
  listRecentUnfollowers:
    "List people who used to follow the user but no longer do, detected by comparing consecutive imported snapshots over time. Requires at least two usable snapshots — if there's only one, this returns an explanation instead of data.",
  listSnapshots:
    "List every Instagram export snapshot the user has imported into Orbly, with date, follower/following counts, and data-completeness status.",
  getQueueStatus:
    "Get the count of accounts currently in the user's manual Unfollow Queue, broken down by pending/completed/skipped. Orbly never unfollows automatically — the queue is just a personal checklist.",
  exportListAsCSV:
    "Generate a downloadable CSV file (username, profile_url, detected_at) for one of the user's relationship lists — nonMutualFollowers, notFollowingBack, mutuals, lostFollowers, or newFollowers — and render a Download CSV button. Use this instead of listing accounts in text whenever the user asks for a spreadsheet, list, export, or download, or when a list is too long to usefully read in chat. The file is generated and downloaded entirely in the user's browser — nothing is uploaded anywhere.",
} as const;
