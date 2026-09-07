import { describe, expect, it } from "vitest";
import { uniqueLabel } from "./transaction";
import { createEngineState, execute } from "../commands/execute";
import { resolveNode } from "../commands/resolve";
import { snapshot } from "./history";
import type { EngineState } from "./types";
import type { GraphCommand } from "../commands/schema";

const ids = () => { let count = 0; return () => `n${++count}`; };
function run(commands: GraphCommand[]) {
  const newId = ids();
  let state: EngineState = createEngineState(), message = "";
  for (const command of commands) { const result = execute(state, command, newId); state = result.state; message = result.message; }
  return { state, message };
}
const add = (label: string): GraphCommand => ({ kind: "add_node", type: "process", label, placement: null });

describe("unique labels", () => {
  it("leaves an unused label alone", () => {
    expect(uniqueLabel(["Start", "Review"], "Check payment")).toBe("Check payment");
  });

  it("numbers repeats from two, keeping the first shape's name intact", () => {
    expect(uniqueLabel(["Process"], "Process")).toBe("Process (2)");
    expect(uniqueLabel(["Process", "Process (2)"], "Process")).toBe("Process (3)");
    // Case is not a distinction anyone can hear.
    expect(uniqueLabel(["process"], "Process")).toBe("Process (2)");
  });

  it("skips a number the author has already used", () => {
    expect(uniqueLabel(["Process", "Process (2)", "Process (4)"], "Process")).toBe("Process (3)");
  });

  it("numbers repeated shapes and says the label it gave them", () => {
    const first = run([add("Process")]);
    expect(first.message).toBe("Added Process node.");
    const second = run([add("Process"), add("Process")]);
    expect(second.state.graph.nodes.map(node => node.label)).toEqual(["Process", "Process (2)"]);
    expect(second.message).toBe("Added Process (2) node.");
    const named = run([add("Review"), add("Review")]);
    expect(named.message).toBe("Added process Review (2).");
  });

  it("keeps a rename from recreating a duplicate", () => {
    const { state, message } = run([add("Review"), add("Approve"),
      { kind: "rename", node: { kind: "label", value: "Approve" }, newLabel: "Review" }]);
    expect(state.graph.nodes.map(node => node.label)).toEqual(["Review", "Review (2)"]);
    expect(message).toBe("Renamed node to Review (2).");
  });

  it("lets a shape keep its own label through a rename", () => {
    const { state } = run([add("Review"),
      { kind: "rename", node: { kind: "label", value: "Review" }, newLabel: "Review" }]);
    expect(state.graph.nodes[0].label).toBe("Review");
  });

  it("resolves a numbered shape from speech, brackets unspoken", () => {
    const { state } = run([add("Process"), add("Process")]);
    // "Process 2" is what dictation produces; the punctuation is not something anyone says.
    expect(resolveNode(snapshot(state), { kind: "label", value: "Process 2" })).toEqual({ kind: "resolved", id: "n2" });
    expect(resolveNode(snapshot(state), { kind: "label", value: "Process" })).toEqual({ kind: "resolved", id: "n1" });
  });
});
