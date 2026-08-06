import { describe, expect, it } from "vitest";
import { matchesAnyExclusionRule, type ExclusionCandidate } from "./exclusion-rules";
import type { ExclusionField, ExclusionRuleRecord } from "@/lib/db/schema";

function rule(
  pattern: string,
  field: ExclusionField = "username",
  matchMode: ExclusionRuleRecord["matchMode"] = "contains"
): ExclusionRuleRecord {
  return { id: `${field}:${pattern}`, pattern, rawPattern: pattern, matchMode, field, note: null, createdAt: new Date().toISOString() };
}

function account(normalizedUsername: string, bio?: string | null): ExclusionCandidate {
  return { normalizedUsername, bio };
}

describe("matchesAnyExclusionRule — username rules", () => {
  it("returns false when there are no rules", () => {
    expect(matchesAnyExclusionRule(account("nba_fan_page"), [])).toBe(false);
  });

  it("matches a contains rule anywhere in the username", () => {
    const rules = [rule("nba")];
    expect(matchesAnyExclusionRule(account("official_nba_updates"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("nba_fan"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("basketball_lover"), rules)).toBe(false);
  });

  it("matches a startsWith rule only at the start", () => {
    const rules = [rule("nba", "username", "startsWith")];
    expect(matchesAnyExclusionRule(account("nba_official"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("my_nba_fan"), rules)).toBe(false);
  });

  it("matches an endsWith rule only at the end", () => {
    const rules = [rule("_official", "username", "endsWith")];
    expect(matchesAnyExclusionRule(account("nba_official"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("official_nba"), rules)).toBe(false);
  });

  it("matches if ANY username rule in the set matches (OR semantics)", () => {
    const rules = [rule("fitness"), rule("crypto")];
    expect(matchesAnyExclusionRule(account("my_fitness_page"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("crypto_daily"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("random_page"), rules)).toBe(false);
  });
});

describe("matchesAnyExclusionRule — bio rules", () => {
  it("matches an account whose captured bio contains the pattern", () => {
    const rules = [rule("s c u", "bio")];
    expect(matchesAnyExclusionRule(account("someuser", "Member of the S C U crew"), rules)).toBe(true);
  });

  it("is case-insensitive for bio text", () => {
    const rules = [rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("someuser", "Talking CRYPTO daily"), rules)).toBe(true);
  });

  it("never matches an account whose bio was never captured — a bio rule cannot retroactively apply", () => {
    const rules = [rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("nobio_account", undefined), rules)).toBe(false);
    expect(matchesAnyExclusionRule(account("nobio_account", null), rules)).toBe(false);
  });

  it("respects matchMode for bio rules the same as username rules", () => {
    const rules = [rule("crypto", "bio", "startsWith")];
    expect(matchesAnyExclusionRule(account("a", "crypto trader since 2020"), rules)).toBe(true);
    expect(matchesAnyExclusionRule(account("b", "day trader, into crypto"), rules)).toBe(false);
  });

  it("does not match a bio rule's pattern against the username, or vice versa", () => {
    // "nba" appears in the username but the rule is scoped to bio, and this
    // account's captured bio doesn't mention it — must not match.
    const bioRule = [rule("nba", "bio")];
    expect(matchesAnyExclusionRule(account("nba_fan", "just here for the vibes"), bioRule)).toBe(false);

    // Conversely, a username rule must not match on bio content.
    const usernameRule = [rule("vibes", "username")];
    expect(matchesAnyExclusionRule(account("nba_fan", "just here for the vibes"), usernameRule)).toBe(false);
  });
});

describe("matchesAnyExclusionRule — combined username + bio rules", () => {
  it("excludes an account matching a username rule even with no bio captured", () => {
    const rules = [rule("nba", "username"), rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("nba_fan", undefined), rules)).toBe(true);
  });

  it("excludes an account matching only a bio rule, when its username doesn't match anything", () => {
    const rules = [rule("nba", "username"), rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("random_handle", "into crypto and hiking"), rules)).toBe(true);
  });

  it("excludes an account matching BOTH kinds — stacking is OR, redundant matches don't change the outcome", () => {
    const rules = [rule("nba", "username"), rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("nba_fan", "into crypto and hiking"), rules)).toBe(true);
  });

  it("does not exclude an account matching neither rule", () => {
    const rules = [rule("nba", "username"), rule("crypto", "bio")];
    expect(matchesAnyExclusionRule(account("gardening_daily", "flowers and plants"), rules)).toBe(false);
  });

  it("stacks three or more rules of mixed fields correctly", () => {
    const rules = [
      rule("nba", "username"),
      rule("official", "username", "endsWith"),
      rule("s c u", "bio"),
      rule("crypto", "bio"),
    ];
    expect(matchesAnyExclusionRule(account("random_official", "gardener"), rules)).toBe(true); // endsWith username
    expect(matchesAnyExclusionRule(account("gardener_page", "Member of the S C U crew"), rules)).toBe(true); // bio
    expect(matchesAnyExclusionRule(account("gardener_page", "flowers"), rules)).toBe(false); // matches nothing
  });
});
