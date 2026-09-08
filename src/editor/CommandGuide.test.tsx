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

  it("offers the embossable guide, naming the code and grade of braille", () => {
    render(<CommandGuide />);
    // "Braille" alone is not a specification: grade 1 and grade 2 are different scripts, and a
    // file that does not say which is a file a reader has to guess at.
    expect(screen.getByRole("link", { name: /Grade 2, contracted/ })).toHaveAttribute("href", "/braille/koi-charts-guide-ueb-grade-2.brf");
    expect(screen.getByRole("link", { name: /Grade 1, uncontracted/ })).toHaveAttribute("href", "/braille/koi-charts-guide-ueb-grade-1.brf");
    expect(screen.getByText(/Unified English Braille/)).toBeInTheDocument();
  });

  it("stays collapsed until asked for, and opens without a mouse", () => {
    render(<CommandGuide />);
    const summary = screen.getByText("What you can say");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    // <summary> is focusable and Enter-activated by the browser; no key handler to get wrong.
    expect(summary.tagName).toBe("SUMMARY");
  });
});
