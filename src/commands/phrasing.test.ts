import { describe, expect, it } from "vitest";
import { stripFillers } from "./phrasing";
import { parseTemplate } from "./templates";
import { parseControl } from "./fast-path";

describe("leading speech fillers", () => {
  it.each([
    ["Now add a decision node.", "add a decision node."],
    ["Okay, now add a process called Review.", "add a process called Review."],
    ["So then connect Start to End", "connect Start to End"],
    ["Can you please delete Check payment?", "delete Check payment?"],
  ])("removes what carries no instruction from %j", (text, stripped) => expect(stripFillers(text)).toBe(stripped));

  // A filler alone is not an empty command: stripping it away would leave nothing to refuse.
  it.each(["Now", "Please.", "Okay"])("leaves %j intact when nothing follows", text => expect(stripFillers(text)).toBe(text.trim()));

  // A label may legitimately end in a courtesy, so only the start of an utterance is trimmed.
  it("keeps trailing courtesy, which may belong to a label", () => {
    expect(stripFillers("add a process called Thank you")).toBe("add a process called Thank you");
  });

  it("reads an everyday request that opens with a filler", () => {
    expect(parseTemplate("Now add a decision node.")).toEqual({ kind: "add_node", type: "decision", label: "Decision", placement: null });
    expect(parseTemplate("Okay, now add a process called Review.")).toEqual({ kind: "add_node", type: "process", label: "Review", placement: null });
    expect(parseControl("Now undo.")).toEqual({ kind: "undo" });
    expect(parseControl("So where am I?")).toEqual({ kind: "walk", direction: "stay", branch: null });
  });
});
