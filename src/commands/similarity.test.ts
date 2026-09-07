import { describe, expect, it } from "vitest";
import { bestMatch, ratio } from "./similarity";

const candidates: { phrase: string; value: Record<string, string> }[] = [
  { phrase: "undo", value: { kind: "undo" } },
  { phrase: "redo", value: { kind: "redo" } },
  { phrase: "cancel", value: { kind: "cancel" } },
  { phrase: "next", value: { kind: "walk", direction: "next" } },
  { phrase: "go next", value: { kind: "walk", direction: "next" } },
  { phrase: "go back", value: { kind: "walk", direction: "back" } },
];

describe("conservative similarity matching", () => {
  it("scores identical text as one and unrelated text near zero", () => {
    expect(ratio("undo", "undo")).toBe(1);
    expect(ratio("undo", "connect start to end")).toBeLessThan(0.3);
  });
  // Dictation inflects and mistypes; none of these change which command was asked for.
  it.each([["Undo.", "undo"], ["Cancelled.", "cancel"], ["Redoing", "redo"], ["go bak", "go back"]])(
    "recovers %j as %s", (text, phrase) => {
      expect(bestMatch(text, candidates)).toEqual(candidates.find(c => c.phrase === phrase)!.value);
    });
  // Two spellings of the same command are not a tie: the margin rule compares commands, not words.
  it("is not blocked by a second phrasing of the same command", () => {
    expect(bestMatch("go nxt", candidates)).toEqual({ kind: "walk", direction: "next" });
  });
  it.each([
    // "nex" is one edit from "next" and so is "text": no floor accepts one and refuses the other.
    ["text", "sounds like next, but is a word of its own"],
    ["nex", "one edit from next, and so is a word that is not a command"],
    ["undue", "a homophone is far in edit distance; only the model can read intent here"],
    ["undo the last three things I said", "a sentence is not a control word"],
    ["cancel the deletion of check payment", "extra words carry meaning that would be dropped"],
    ["go", "too short to have a clear winner"],
    ["", "nothing to match"],
  ])("refuses %j: %s", text => expect(bestMatch(text, candidates)).toBeNull());
  // A near-tie between two genuinely different commands is the case where guessing does harm.
  it("refuses when the runner-up is a different command and close behind", () => {
    const pair = [{ phrase: "add end", value: { kind: "a" } }, { phrase: "add and", value: { kind: "b" } }];
    expect(bestMatch("add ends", pair)).toBeNull();
  });
  it("respects a caller that demands a higher bar", () => {
    expect(bestMatch("Cancelled.", candidates, { floor: 0.99 })).toBeNull();
    expect(bestMatch("Cancelled.", candidates, { margin: 0.9 })).toBeNull();
  });
});
