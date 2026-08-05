import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMarkdown } from "./ChatMarkdown";

/**
 * Regression coverage: assistant chat text used to render as raw text, so
 * markdown the model wrote (**bold**, links, lists) showed up as literal
 * asterisks/brackets in the bubble instead of being formatted — a real bug
 * observed on the live site. This confirms ChatMarkdown actually parses
 * markdown into real elements rather than passing text through unchanged.
 */
describe("ChatMarkdown", () => {
  it("renders **bold** as a real <strong> element, not literal asterisks", () => {
    render(<ChatMarkdown text="**377 accounts** don't follow you back" />);
    const strong = screen.getByText("377 accounts");
    expect(strong.tagName).toBe("STRONG");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
  });

  it("renders a markdown link as a real anchor with target=_blank", () => {
    render(<ChatMarkdown text="See [your export](https://instagram.com/download/request)" />);
    const link = screen.getByRole("link", { name: "your export" });
    expect(link).toHaveAttribute("href", "https://instagram.com/download/request");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a markdown list as real <ul>/<li> elements", () => {
    render(<ChatMarkdown text={"Two things:\n- first item\n- second item"} />);
    expect(screen.getByText("first item").closest("li")).not.toBeNull();
    expect(screen.getByText("second item").closest("li")).not.toBeNull();
  });

  it("turns a single newline into a visible line break (soft breaks preserved)", () => {
    const { container } = render(<ChatMarkdown text={"line one\nline two"} />);
    expect(container.querySelector("br")).not.toBeNull();
  });
});
