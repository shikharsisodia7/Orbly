import { describe, expect, it } from "vitest";
import { triageFeedback } from "./feedback-triage";

describe("triageFeedback", () => {
  it("categorizes a 'still shows up after marking done' report as not-saving, with a real suggested action", () => {
    const result = triageFeedback("I marked someone as unfollowed but they still show up in the list");
    expect(result.category).toBe("not-saving");
    expect(result.suggestedAction?.id).toBe("resync-queue");
  });

  it("categorizes a banned/deactivated-account report as stale-data, with no fake auto-fix", () => {
    const result = triageFeedback("This account is banned but still shows up as active");
    expect(result.category).toBe("stale-data");
    expect(result.suggestedAction).toBeNull();
  });

  it("categorizes a count-mismatch report as wrong-count", () => {
    const result = triageFeedback("The follower count is wrong, it doesn't match what Instagram shows");
    expect(result.category).toBe("wrong-count");
  });

  it("categorizes a visual-bug report as ui-issue", () => {
    const result = triageFeedback("The button on the settings page looks broken on mobile");
    expect(result.category).toBe("ui-issue");
  });

  it("categorizes a suggestion as feature-request", () => {
    const result = triageFeedback("It would be great if you could add dark mode");
    expect(result.category).toBe("feature-request");
  });

  it("falls back to other for anything unmatched, with no suggested action", () => {
    const result = triageFeedback("just wanted to say hi");
    expect(result.category).toBe("other");
    expect(result.suggestedAction).toBeNull();
  });

  it("never invents a suggested action for a category without one", () => {
    for (const message of [
      "This account is banned but still shows up",
      "The count is wrong",
      "The layout looks weird",
      "Please add a dark mode",
      "just saying hi",
    ]) {
      const result = triageFeedback(message);
      if (result.category !== "not-saving") {
        expect(result.suggestedAction).toBeNull();
      }
    }
  });
});
