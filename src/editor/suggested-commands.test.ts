import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import { suggestedCommands } from "./suggested-commands";

const graph: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "a", type: "start", label: "A very long beginning" },
    { id: "b", type: "process", label: "Review" },
  ],
  edges: [{ id: "edge", source: "a", target: "b" }],
};

const base = {
  graph,
  displayIds: { a: "N1", b: "N2" },
  focusedNodeId: null,
  selectedEdgeId: null,
  selectedNodeCount: 0,
  pendingKind: null,
  auditOpen: false,
  playbackStatus: "idle" as const,
  playbackChoices: [],
};

describe("contextual voice command suggestions", () => {
  it("starts an empty chart with creation syntax", () => {
    const result = suggestedCommands({ ...base, graph: { schemaVersion: 1, nodes: [], edges: [] }, displayIds: {} });
    expect(result).toEqual({
      context: "Start building",
      commands: ["add a start called Begin", "add a process called Review", "open project"],
    });
  });

  it("uses selection-relative syntax for a focused shape", () => {
    expect(suggestedCommands({ ...base, focusedNodeId: "a" }).commands).toEqual([
      "connect this to a new process called Review",
      "rename this to New label",
      "describe this",
    ]);
  });

  it("uses stable short references for a selected connection", () => {
    expect(suggestedCommands({ ...base, selectedEdgeId: "edge" }).commands).toEqual([
      "label connection from N1 to N2 as Yes",
      "delete the connection from N1 to N2",
    ]);
  });

  it("prioritises commands for active guided modes and confirmations", () => {
    expect(suggestedCommands({ ...base, pendingKind: "deletion", auditOpen: true }).commands).toEqual(["confirm delete", "cancel"]);
    expect(suggestedCommands({ ...base, auditOpen: true }).commands).toEqual(["next issue", "repeat issue", "close check"]);
    expect(suggestedCommands({ ...base, playbackStatus: "choosing_branch", playbackChoices: [{ label: "Yes" }] }).commands).toEqual(["take Yes", "stop test"]);
  });
});
