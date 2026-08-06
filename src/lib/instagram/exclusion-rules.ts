import type { ExclusionRuleRecord } from "@/lib/db/schema";
import { matchesQuery, normalizeQueryText } from "./text-match";

/**
 * Pure matching logic for persistent, pattern-based exclusion rules (e.g.
 * "nothing with nba in the name", or "nothing whose bio mentions crypto").
 * Kept separate from the Dexie-backed CRUD in db/queries.ts, the same way
 * chat-data.ts's search logic is kept apart from chat-tools.ts — this can be
 * unit tested without touching IndexedDB, and it's the one place the actual
 * match semantics live, so doesNotFollowBack, recent unfollowers, and CSV
 * exports can't drift into disagreeing about what a rule matches.
 *
 * A "username" rule is evaluated against every account, since username is
 * always known. A "bio" rule can only ever be evaluated against an account
 * whose bio has actually been captured (via the browser extension's
 * explicit, one-account-at-a-time lookup, never bulk-fetched) — an account
 * with no cached bio simply can't match a bio rule, which is correct: Orbly
 * has no idea what that account's bio says, so it can't claim a match.
 * Multiple rules of either kind stack with OR semantics: matching ANY rule
 * excludes the account.
 */
export interface ExclusionCandidate {
  normalizedUsername: string;
  /** The account's cached bio, if the extension has ever captured it. Null/undefined if never looked up. */
  bio?: string | null;
}

function ruleMatches(candidate: ExclusionCandidate, rule: ExclusionRuleRecord): boolean {
  if (rule.field === "bio") {
    if (!candidate.bio) return false;
    return matchesQuery(normalizeQueryText(candidate.bio), rule.pattern, rule.matchMode);
  }
  return matchesQuery(candidate.normalizedUsername, rule.pattern, rule.matchMode);
}

export function matchesAnyExclusionRule(candidate: ExclusionCandidate, rules: ExclusionRuleRecord[]): boolean {
  return rules.some((rule) => ruleMatches(candidate, rule));
}
