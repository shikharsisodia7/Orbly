import type { FeedbackCategory } from "@/lib/db/schema";

/**
 * Keyword-based categorization for a self-service feedback report, plus (for
 * categories where one genuinely exists) a real, already-implemented action
 * the user can run immediately from the Help & Feedback page instead of
 * waiting on manual review — e.g. a "not saving" report gets pointed at the
 * same queue-reconciliation function a fresh import already runs. This is
 * deliberately narrow: only categories with an actual corrective action
 * available get one, everything else is just filed for review rather than
 * faking a fix that doesn't exist.
 */
export interface TriageResult {
  category: FeedbackCategory;
  /** Present only when a real, safe, already-implemented fix exists for this category. */
  suggestedAction: {
    id: "resync-queue";
    label: string;
    description: string;
  } | null;
}

// Order matters: stale-data's keywords (banned/deactivated/deleted/stale)
// are specific enough that they should win even when the same message also
// contains a generic not-saving phrase like "still shows up" — e.g. "this
// banned account still shows up" is about stale account data, not a
// persistence bug, so stale-data is checked first.
const KEYWORD_RULES: Array<{ category: FeedbackCategory; patterns: RegExp[] }> = [
  {
    category: "stale-data",
    patterns: [/stale/i, /outdated/i, /old data/i, /banned/i, /deactivat/i, /deleted account/i, /no longer exist/i],
  },
  {
    category: "not-saving",
    patterns: [/still (show|appear|there)/i, /came back/i, /reappear/i, /didn'?t save/i, /not sav/i, /keeps showing/i],
  },
  {
    category: "wrong-count",
    patterns: [/wrong (count|number)/i, /incorrect (count|number)/i, /doesn'?t match/i, /count is off/i, /miscount/i],
  },
  {
    category: "ui-issue",
    patterns: [/looks (bad|broken|weird)/i, /ui (bug|issue|glitch)/i, /layout/i, /button.*(broken|not work)/i, /display/i],
  },
  {
    category: "feature-request",
    patterns: [/wish/i, /would be (nice|great|good)/i, /feature request/i, /please add/i, /can you add/i, /suggestion/i],
  },
];

export function triageFeedback(message: string): TriageResult {
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => p.test(message))) {
      return {
        category: rule.category,
        suggestedAction:
          rule.category === "not-saving"
            ? {
                id: "resync-queue",
                label: "Re-sync my unfollow queue",
                description:
                  "Re-checks your latest imported snapshot against your queue and marks anyone no longer in your following list as done — the same check a fresh import already runs automatically.",
              }
            : null,
      };
    }
  }
  return { category: "other", suggestedAction: null };
}
