import { describe, expect, it } from "vitest";
import { parseLocal } from "./local";

describe("local command sequences", () => {
  it("combines locally recognised edits joined by then", () => {
    expect(parseLocal("Now add a start, then add a process.")).toEqual({
      kind: "compound",
      commands: [
        { kind: "add_node", type: "start", label: "Start", placement: null },
        { kind: "add_node", type: "process", label: "Process", placement: null },
      ],
    });
  });

  it("combines edits joined by and when the next words clearly begin a command", () => {
    expect(parseLocal("add a start and connect it to a new decision labelled Approved?")).toEqual({
      kind: "compound",
      commands: [
        { kind: "add_node", type: "start", label: "Start", placement: null },
        { kind: "connect_new", source: { kind: "focus" }, type: "decision", label: "Approved?" },
      ],
    });
  });

  it("does not split command words inside a quoted label", () => {
    expect(parseLocal('add a process called "Research and then approve"')).toEqual({
      kind: "add_node",
      type: "process",
      label: "Research and then approve",
      placement: null,
    });
  });

  it("sends the whole utterance to interpretation when any clause is uncertain", () => {
    expect(parseLocal("add a start then make it sensible")).toBeNull();
    expect(parseLocal("undo and add a process")).toBeNull();
  });
});
