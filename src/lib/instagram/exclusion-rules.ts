import type { ExclusionRuleRecord } from "@/lib/db/schema";
import { matchesQuery } from "./text-match";

/**
 * Pure matching logic for persistent, pattern-based exclusion rules (e.g.
 * "nothing with nba in the name"). Kept separate from the Dexie-backed CRUD
 * in db/queries.ts, the same way chat-data.ts's search logic is kept apart
 * from chat-tools.ts — this can be unit tested without touching IndexedDB,
 * and it's the one place the actual match semantics live, so
 * doesNotFollowBack, recent unfollowers, and CSV exports can't drift into
 * disagreeing about what a rule matches.
 *
 * Every rule is evaluated against USERNAME only — Instagram's data export
 * has no bio field, so a rule can never actually match on bio text no
 * matter how the user phrased their request. Callers that surface rules to
 * the user (chat tool descriptions, the system prompt) are responsible for
 * being upfront about that limitation.
 */
export function matchesAnyExclusionRule(normalizedUsername: string, rules: ExclusionRuleRecord[]): boolean {
  return rules.some((rule) => matchesQuery(normalizedUsername, rule.pattern, rule.matchMode));
}
