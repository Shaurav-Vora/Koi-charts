import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import CommandGuide from "./CommandGuide";
import { grammar, grammarExamples, modelOnly } from "../commands/grammar";

describe("command guide", () => {
  it("shows every documented phrase, so the page and the parser cannot disagree", () => {
    const { container } = render(<CommandGuide />);
    const text = container.textContent ?? "";
    for (const example of grammarExamples) expect(text).toContain(example.say);
    for (const entry of modelOnly) expect(text).toContain(entry.say);
  });

  it("gives each section a heading to jump between", () => {
    render(<CommandGuide />);
    for (const section of grammar) expect(screen.getByRole("heading", { name: section.title })).toBeInTheDocument();
  });

  it("stays collapsed until asked for, and opens without a mouse", () => {
    render(<CommandGuide />);
    const summary = screen.getByText("What you can say");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    // <summary> is focusable and Enter-activated by the browser; no key handler to get wrong.
    expect(summary.tagName).toBe("SUMMARY");
  });
});
