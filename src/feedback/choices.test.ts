import { describe, expect, it } from "vitest";
import { choiceLabels, describeChoices } from "./choices";
import type { FlowGraph } from "../graph/types";

const graph: FlowGraph = {
  schemaVersion: 1,
  nodes: [{ id: "n1", type: "process", label: "Check payment" }, { id: "n2", type: "process", label: "Check payments" },
    { id: "n3", type: "end", label: "End" }, { id: "n4", type: "end", label: "Done" }],
  edges: [{ id: "e1", source: "n1", target: "n3", label: "Yes" }, { id: "e2", source: "n1", target: "n4" }],
};

describe("clarification choices", () => {
  it("offers shapes by number and label, never by ID", () => {
    const message = describeChoices(graph, ["n1", "n2"], "node");
    expect(message).toBe("Two shapes match. Say one for Check payment, or two for Check payments.");
    expect(message).not.toContain("n1");
  });

  it("names a connection by its ends, and its label when it has one", () => {
    expect(describeChoices(graph, ["e1", "e2"], "edge"))
      .toBe("Two connections match. Say one for Yes, Check payment to End, or two for Check payment to Done.");
  });

  it("offers three at most and says how to reach the rest", () => {
    const message = describeChoices(graph, ["n1", "n2", "n3", "n4"], "node");
    expect(message).toContain("Several shapes match.");
    expect(message).toContain("three for End.");
    expect(message).toContain("say the exact label");
    expect(message).not.toContain("Done");
  });

  it("gives the buttons the same names the reply uses", () => {
    expect(choiceLabels(graph, ["n1", "n2"], "node")).toEqual(["Check payment", "Check payments"]);
  });
});
