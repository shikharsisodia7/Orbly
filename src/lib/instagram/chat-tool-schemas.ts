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
    "Check whether a specific username follows the user and/or the user follows that username, based on the latest snapshot.",
  listRecentUnfollowers:
    "List people who used to follow the user but no longer do, detected by comparing consecutive imported snapshots over time. Requires at least two usable snapshots — if there's only one, this returns an explanation instead of data.",
  listSnapshots:
    "List every Instagram export snapshot the user has imported into Orbly, with date, follower/following counts, and data-completeness status.",
  getQueueStatus:
    "Get the count of accounts currently in the user's manual Unfollow Queue, broken down by pending/completed/skipped. Orbly never unfollows automatically — the queue is just a personal checklist.",
} as const;
