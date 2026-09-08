// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { brailleGuide, grades, translate } from "./translate.mjs";
import { paginate, wrap, CELLS_PER_LINE } from "./emboss";

const file = (grade: string) => readFileSync(`public/braille/koi-charts-guide-ueb-grade-${grade}.brf`, "ascii");

describe("the embossable command guide", () => {
  // The point of translating with liblouis is that nobody has to trust hand-made dots. These are
  // the translator's own answers for phrases whose contractions are worth pinning down: "the" is
  // one cell in grade 2 and three letters in grade 1, and a digit takes a number sign either way.
  it("produces real UEB, not a substitution of letters for dots", () => {
    expect(translate("delete the decision", 2)).toBe("delete ! deci.n");
    expect(translate("delete the decision", 1)).toBe("delete the decision");
    expect(translate("Process 3", 2)).toBe(",process #c");
  });

  it.each(Object.keys(grades))("keeps the grade %s file in step with the syntax", grade => {
    // Fails when grammar.ts changes without `npm run braille`, the same way the contract test
    // fails when a documented phrase stops parsing. The guide cannot go stale in either form.
    expect(file(grade)).toBe(brailleGuide(Number(grade)));
  });

  it.each(Object.keys(grades))("fits grade %s onto a braille page", grade => {
    const lines = file(grade).split(/\r\n|\f/);
    expect(Math.max(...lines.map(line => line.length))).toBeLessThanOrEqual(CELLS_PER_LINE);
    // Braille ASCII only: anything outside it would emboss as a wrong cell or nothing at all.
    expect(file(grade)).toMatch(/^[\x20-\x7e\r\n\f]+$/);
  });
});

describe("page layout", () => {
  it("continues an overrun line with a two-cell indent rather than splitting a word", () => {
    expect(wrap("  ,head+ )s a fairly l;g l9e ( braille t goes p/ 40", CELLS_PER_LINE))
      .toEqual(["  ,head+ )s a fairly l;g l9e ( braille t", "    goes p/ 40"]);
    expect(wrap("x".repeat(50), 40)).toEqual(["x".repeat(50)]);
  });

  it("separates pages with a form feed and drops a blank line at the foot", () => {
    expect(paginate(["a", "b", "", "c"], 3)).toBe("a\r\nb\r\n\fc\r\n");
  });
});
