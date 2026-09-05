// @vitest-environment node
import { describe, expect, it } from "vitest";
import { graphFixture } from "../test/fixtures";
import { assertGraph, createEmptyGraph } from "./invariants";

describe("graph integrity", () => {
  it("creates independent empty version-one snapshots", () => {
    const first = createEmptyGraph();
    expect(first).toEqual({ schemaVersion: 1, nodes: [], edges: [] });
    expect(first.nodes).not.toBe(createEmptyGraph().nodes);
    expect(first.edges).not.toBe(createEmptyGraph().edges);
    expect(() => assertGraph(first)).not.toThrow();
  });
  it("accepts every node type without modifying input", () => {
    const graph = graphFixture();
    const before = structuredClone(graph);
    expect(() => assertGraph(graph)).not.toThrow();
    expect(graph).toEqual(before);
    expect(JSON.parse(JSON.stringify(graph))).toEqual(graph);
  });
  it("permits duplicate labels and multi-node cycles", () => {
    const graph = graphFixture();
    graph.nodes[1].label = "Begin";
    graph.edges.push({ id: "e4", source: "n3", target: "n2" });
    expect(() => assertGraph(graph)).not.toThrow();
  });
  it("accepts disconnected and incomplete charts during authoring", () => {
    expect(() => assertGraph({ schemaVersion: 1, nodes: [{ id: "p", type: "process", label: "Work" }], edges: [] })).not.toThrow();
  });
  it.each(["before", "after", "above", "below", "left_of", "right_of"])("accepts %s placement without adding a connection", relation => {
    const graph = { schemaVersion: 1, nodes: [
      { id: "a", type: "start", label: "A" },
      { id: "b", type: "end", label: "B", placement: { relation, referenceNodeId: "a" } },
    ], edges: [] };
    expect(() => assertGraph(graph)).not.toThrow();
    expect(graph.edges).toEqual([]);
  });
  const invalidGraphs: [string, unknown][] = [
    ["null", null], ["array", []], ["missing version", { nodes: [], edges: [] }],
    ["unknown version", { schemaVersion: 2, nodes: [], edges: [] }],
    ["non-finite version", { schemaVersion: Infinity, nodes: [], edges: [] }],
    ["extra graph property", { ...graphFixture(), preview: true }],
    ["duplicate node ID", { ...graphFixture(), nodes: [{ id: "n1", type: "start", label: "A" }, { id: "n1", type: "end", label: "B" }] }],
    ["duplicate edge ID", { ...graphFixture(), edges: [{ id: "e1", source: "n1", target: "n2" }, { id: "e1", source: "n2", target: "n3" }] }],
    ["missing source", { ...graphFixture(), edges: [{ id: "e1", source: "missing", target: "n2" }] }],
    ["missing target", { ...graphFixture(), edges: [{ id: "e1", source: "n1", target: "missing" }] }],
    ["self-edge", { ...graphFixture(), edges: [{ id: "e1", source: "n1", target: "n1" }] }],
    ["extra edge property", { ...graphFixture(), edges: [{ id: "e1", source: "n1", target: "n2", weight: NaN }] }],
    ...[
      { id: "", type: "process", label: "A" },
      { id: " ", type: "process", label: "A" },
      { id: "a", type: "image", label: "A" },
      { id: "a", type: "process", label: "" },
      { id: "a", type: "process", label: " \t" },
      { id: "a", type: "process", label: NaN },
      { id: "a", type: "process", label: "A", x: 10 },
      { id: "a", type: "process", label: "A", placement: { relation: "below", referenceNodeId: "missing" } },
      { id: "a", type: "process", label: "A", placement: { relation: "below", referenceNodeId: "a" } },
      { id: "a", type: "process", label: "A", placement: { relation: "beside", referenceNodeId: "a" } },
      { id: "a", type: "process", label: "A", placement: { relation: "below", referenceNodeId: "a", x: 1 } },
    ].map((node, index): [string, unknown] => [`invalid node ${index + 1}`, { schemaVersion: 1, nodes: [node], edges: [] }]),
  ];
  it.each(invalidGraphs)("rejects %s without modifying it", (_, graph) => {
    const before = structuredClone(graph);
    expect(() => assertGraph(graph)).toThrow();
    expect(graph).toEqual(before);
  });
});
