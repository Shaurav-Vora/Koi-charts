// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FlowGraph } from "./types";
import { graphFixture } from "../test/fixtures";
import { validateGraph, tracePath } from "./queries";

const branch = (): FlowGraph => ({ schemaVersion: 1,
  nodes: [
    { id: "s", type: "start", label: "Begin" }, { id: "b", type: "process", label: "Right" },
    { id: "a", type: "process", label: "Left" }, { id: "e", type: "end", label: "End" },
  ], edges: [
    { id: "sb", source: "s", target: "b" }, { id: "sa", source: "s", target: "a" },
    { id: "be", source: "b", target: "e" }, { id: "ae", source: "a", target: "e" },
  ],
});

describe("structural warnings", () => {
  it("reports missing start and end in an empty graph", () => {
    expect(validateGraph({ schemaVersion: 1, nodes: [], edges: [] })).toEqual(["No start node.", "No end node."]);
  });
  it("reports incomplete decision branches", () => {
    expect(validateGraph(graphFixture())).toContain('Decision "Payment approved" (n3) has fewer than two outgoing branches.');
  });
  it("reports unlabeled decision edges with their identity", () => {
    const graph = graphFixture(); graph.edges.push({ id: "retry", source: "n3", target: "n2" });
    expect(validateGraph(graph)).toEqual(['Decision "Payment approved" (n3) has an unlabeled outgoing connection (retry).']);
  });
  it("reports unreachable nodes", () => {
    const graph = graphFixture(); graph.nodes.push({ id: "island", type: "process", label: "Island" });
    expect(validateGraph(graph)).toContain('Unreachable from any start node: "Island" (island).');
  });
  it("uses all starts when checking reachability", () => {
    const graph = branch(); graph.nodes.push({ id: "s2", type: "start", label: "Second start" }, { id: "e2", type: "end", label: "Second end" });
    graph.edges.push({ id: "se2", source: "s2", target: "e2" });
    expect(validateGraph(graph)).toEqual([]);
  });
  it("does not report a cycle as a structural error", () => {
    const graph = graphFixture(); graph.edges.push({ id: "retry", source: "n3", target: "n2", label: "no" });
    expect(validateGraph(graph)).toEqual([]);
  });
  it("reports absence of a start without inventing reachability roots", () => {
    expect(validateGraph({ schemaVersion: 1, nodes: [{ id: "e", type: "end", label: "End" }], edges: [] })).toEqual(["No start node."]);
  });
  it("orders warnings deterministically without sorting the input arrays", () => {
    const graph = graphFixture(); graph.nodes.reverse(); graph.edges.reverse();
    const before = structuredClone(graph);
    expect(validateGraph(graph)).toEqual(validateGraph(graphFixture())); expect(graph).toEqual(before);
  });
});

describe("directed path tracing", () => {
  it("returns a route to a requested target", () => { expect(tracePath(graphFixture(), "n1", "n4")).toEqual(["n1", "n2", "n3", "n4"]); });
  it("returns a shortest route, breaking ties by stable node IDs", () => {
    expect(tracePath(branch(), "s", "e")).toEqual(["s", "a", "e"]);
    const graph = branch(); graph.edges.push({ id: "direct", source: "s", target: "e" });
    expect(tracePath(graph, "s", "e")).toEqual(["s", "e"]);
  });
  it("returns an empty route when the target is unreachable", () => { expect(tracePath(graphFixture(), "n4", "n1")).toEqual([]); });
  it("allows a zero-edge route from a node to itself", () => { expect(tracePath(graphFixture(), "n2", "n2")).toEqual(["n2"]); });
  it("stops at a branch instead of choosing one", () => { expect(tracePath(branch(), "s")).toEqual(["s"]); });
  it("stops at an end node", () => { expect(tracePath(graphFixture(), "n1")).toEqual(["n1", "n2", "n3", "n4"]); });
  it("stops at an end even if that node has an outgoing edge", () => {
    const graph = graphFixture(); graph.edges.push({ id: "loop", source: "n4", target: "n1" });
    expect(tracePath(graph, "n4")).toEqual(["n4"]);
  });
  it("stops at a dead end", () => {
    const graph = graphFixture(); graph.edges = graph.edges.filter(edge => edge.id !== "e2");
    expect(tracePath(graph, "n1")).toEqual(["n1", "n2"]);
  });
  it("terminates a cycle and includes its closing node once", () => {
    const graph = graphFixture(); graph.edges = [{ id: "a", source: "n1", target: "n2" }, { id: "b", source: "n2", target: "n1" }];
    expect(tracePath(graph, "n1")).toEqual(["n1", "n2", "n1"]);
    expect(tracePath(graph, "n1", "n4")).toEqual([]);
  });
  it("does not guess between parallel outgoing edges", () => {
    const graph = graphFixture(); graph.edges.push({ id: "other", source: "n1", target: "n2", label: "alternate" });
    expect(tracePath(graph, "n1")).toEqual(["n1"]);
  });
  it.each([["missing", "n1"], ["n1", "missing"]])("rejects missing endpoints %s and %s", (start, end) => {
    expect(() => tracePath(graphFixture(), start, end)).toThrow(/not found/i);
  });
});
