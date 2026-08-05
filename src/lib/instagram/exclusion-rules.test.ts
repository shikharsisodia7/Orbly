import { describe, expect, it } from "vitest";
import { matchesAnyExclusionRule } from "./exclusion-rules";
import type { ExclusionRuleRecord } from "@/lib/db/schema";

function rule(pattern: string, matchMode: ExclusionRuleRecord["matchMode"] = "contains"): ExclusionRuleRecord {
  return { id: pattern, pattern, rawPattern: pattern, matchMode, note: null, createdAt: new Date().toISOString() };
}

describe("matchesAnyExclusionRule", () => {
  it("returns false when there are no rules", () => {
    expect(matchesAnyExclusionRule("nba_fan_page", [])).toBe(false);
  });

  it("matches a contains rule anywhere in the username", () => {
    const rules = [rule("nba")];
    expect(matchesAnyExclusionRule("official_nba_updates", rules)).toBe(true);
    expect(matchesAnyExclusionRule("nba_fan", rules)).toBe(true);
    expect(matchesAnyExclusionRule("basketball_lover", rules)).toBe(false);
  });

  it("matches a startsWith rule only at the start", () => {
    const rules = [rule("nba", "startsWith")];
    expect(matchesAnyExclusionRule("nba_official", rules)).toBe(true);
    expect(matchesAnyExclusionRule("my_nba_fan", rules)).toBe(false);
  });

  it("matches an endsWith rule only at the end", () => {
    const rules = [rule("_official", "endsWith")];
    expect(matchesAnyExclusionRule("nba_official", rules)).toBe(true);
    expect(matchesAnyExclusionRule("official_nba", rules)).toBe(false);
  });

  it("matches if ANY rule in the set matches (OR semantics)", () => {
    const rules = [rule("fitness"), rule("crypto")];
    expect(matchesAnyExclusionRule("my_fitness_page", rules)).toBe(true);
    expect(matchesAnyExclusionRule("crypto_daily", rules)).toBe(true);
    expect(matchesAnyExclusionRule("random_page", rules)).toBe(false);
  });
});
