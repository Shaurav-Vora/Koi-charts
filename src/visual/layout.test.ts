// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import { graphFixture } from "../test/fixtures";
import { layoutGraph } from "./layout";

describe("deterministic canvas layout", () => {
  it("lays out an empty graph", () => { expect(layoutGraph({ schemaVersion: 1, nodes: [], edges: [] })).toEqual({ nodes: [], edges: [] }); });
  it("produces finite node bounds and directed edge paths without mutating the graph", () => {
    const graph = graphFixture(), before = structuredClone(graph); const frame = layoutGraph(graph);
    expect(frame.nodes).toHaveLength(4); expect(frame.edges).toHaveLength(3);
    expect(frame.nodes.every(n => [n.x, n.y, n.width, n.height].every(Number.isFinite) && n.width > 0 && n.height > 0)).toBe(true);
    expect(frame.edges.every(e => e.points.length >= 2 && e.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true);
    expect(graph).toEqual(before);
  });
  it("is independent of input array order", () => {
    const graph = graphFixture(); graph.nodes.reverse(); graph.edges.reverse();
    expect(layoutGraph(graph)).toEqual(layoutGraph(graphFixture()));
  });
  it.each(["before", "after", "above", "below", "left_of", "right_of"] as const)("honors simple %s placement", relation => {
    const graph: FlowGraph = { schemaVersion: 1, nodes: [{ id: "a", type: "start", label: "A" }, { id: "b", type: "process", label: "B", placement: { relation, referenceNodeId: "a" } }], edges: [] };
    const [a, b] = layoutGraph(graph).nodes;
    if (["before", "above"].includes(relation)) expect(b.y + b.height).toBeLessThan(a.y);
    if (["after", "below"].includes(relation)) expect(b.y).toBeGreaterThan(a.y + a.height);
    if (relation === "left_of") expect(b.x + b.width).toBeLessThan(a.x);
    if (relation === "right_of") expect(b.x).toBeGreaterThan(a.x + a.width);
  });
  it("separates nodes competing for the same placement", () => {
    const graph: FlowGraph = { schemaVersion: 1, nodes: [{ id: "a", type: "start", label: "A" }, ...["b", "c", "d"].map(id => ({ id, type: "process" as const, label: id, placement: { relation: "below" as const, referenceNodeId: "a" } }))], edges: [] };
    const { nodes } = layoutGraph(graph);
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
    }
  });
  it("terminates conflicting hints and graph cycles deterministically", () => {
    const graph = graphFixture() as FlowGraph;
    graph.nodes[0].placement = { relation: "below", referenceNodeId: "n2" };
    graph.nodes[1].placement = { relation: "below", referenceNodeId: "n1" };
    graph.edges.push({ id: "loop", source: "n3", target: "n1" });
    expect(layoutGraph(graph)).toEqual(layoutGraph(graph));
  });
  it("rejects self placement", () => {
    const graph = graphFixture() as FlowGraph; graph.nodes[0].placement = { relation: "above", referenceNodeId: "n1" };
    expect(() => layoutGraph(graph)).toThrow();
  });
});

it("routes horizontal connections through facing side ports", () => {
  const graph: FlowGraph = { schemaVersion: 1, nodes: [{ id: "z", type: "start", label: "Start" }, { id: "a", type: "process", label: "Process", placement: { relation: "right_of", referenceNodeId: "z" } }], edges: [{ id: "edge", source: "z", target: "a" }] };
  const frame = layoutGraph(graph), start = frame.nodes.find(n => n.id === "z")!, end = frame.nodes.find(n => n.id === "a")!;
  expect(end.x).toBeGreaterThan(start.x + start.width);
  expect(frame.edges[0].points[0]).toEqual({ x: start.x + start.width, y: start.y + start.height / 2 });
  expect(frame.edges[0].points.at(-1)).toEqual({ x: end.x, y: end.y + end.height / 2 });
});
