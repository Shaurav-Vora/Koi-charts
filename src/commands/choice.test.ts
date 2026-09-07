import { describe, expect, it } from "vitest";
import { parseChoice } from "./choice";

describe("spoken clarification replies", () => {
  it.each([["one", 0], ["Two.", 1], ["three", 2], ["1", 0], ["number two", 1], ["the second one", 1], ["option 3", 2], ["Okay, two.", 1]])(
    "reads %s as a choice", (text, index) => { expect(parseChoice(text as string, 3)).toBe(index); });

  it("refuses a number nobody offered", () => {
    expect(parseChoice("three", 2)).toBeNull();
    expect(parseChoice("four", 3)).toBeNull();
  });

  // A reply that is not a choice is a new command or a label, and the question stays open.
  it.each(["cancel", "Check payment", "rename it to Review", "", "won"])("refuses %s", text => {
    expect(parseChoice(text, 3)).toBeNull();
  });
});
