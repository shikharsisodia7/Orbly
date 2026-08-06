import { describe, expect, it } from "vitest";
import { resolveModel } from "./route";

/**
 * resolveModel is the one piece of the chat route's model-switching logic
 * that's meaningfully testable without an actual network call — it just
 * decides which model identifier/provider instance streamText receives.
 * Claude (via the Vercel AI Gateway) must stay the default for anything
 * that isn't exactly "gpt", so an unrecognized or missing value can never
 * silently change a user's existing conversation's provider.
 */
describe("resolveModel", () => {
  it("routes 'gpt' to an OpenAI model instance, not the Gateway string", () => {
    const model = resolveModel("gpt");
    expect(model).not.toBe("anthropic/claude-sonnet-5");
  });

  it("defaults to the Claude Gateway model when no model is specified", () => {
    expect(resolveModel(undefined)).toBe("anthropic/claude-sonnet-5");
  });

  it("defaults to Claude for an unrecognized value rather than erroring", () => {
    expect(resolveModel("some-other-model")).toBe("anthropic/claude-sonnet-5");
    expect(resolveModel(null)).toBe("anthropic/claude-sonnet-5");
    expect(resolveModel(123)).toBe("anthropic/claude-sonnet-5");
  });

  it("is case-sensitive — 'GPT' or 'Gpt' must not accidentally match 'gpt'", () => {
    expect(resolveModel("GPT")).toBe("anthropic/claude-sonnet-5");
    expect(resolveModel("Gpt")).toBe("anthropic/claude-sonnet-5");
  });
});
