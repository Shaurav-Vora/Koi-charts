// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import { auditGraph } from "./engine";

const completeGraph = (): FlowGraph => ({
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin" },
    { id: "end", type: "end", label: "Finish" },
  ],
  edges: [{ id: "finish", source: "start", target: "end" }],
});

const codesFor = (graph: FlowGraph, nodeId: string) => auditGraph(graph)
  .filter(issue => issue.target.focusNodeId === nodeId)
  .map(issue => issue.code);

describe("chart audit", () => {
  it("returns stable required issues for a chart without start or end nodes", () => {
    const issues = auditGraph({ schemaVersion: 1, nodes: [], edges: [] });

    expect(issues.map(({ id, code, severity, target }) => ({ id, code, severity, target }))).toEqual([
      {
        id: "chart:missing-start",
        code: "missing-start",
        severity: "required",
        target: { kind: "chart", focusNodeId: null },
      },
      {
        id: "chart:missing-end",
        code: "missing-end",
        severity: "required",
        target: { kind: "chart", focusNodeId: null },
      },
    ]);
  });

  it("reports more than one Start node as one chart-level issue", () => {
    const graph = completeGraph();
    graph.nodes.push({ id: "other-start", type: "start", label: "Alternate" });
    graph.edges.push({ id: "other-finish", source: "other-start", target: "end" });

    expect(auditGraph(graph).map(issue => issue.id)).toEqual(["chart:multiple-starts"]);
  });

  it("reports unreachable nodes without also reporting that they cannot reach an End", () => {
    const graph = completeGraph();
    graph.nodes.push({ id: "island", type: "process", label: "Island" });

    expect(codesFor(graph, "island")).toEqual(["unreachable-node", "dead-end"]);
  });

  it("reports a reachable non-End node with no outgoing connection", () => {
    const graph = completeGraph();
    graph.nodes.push({ id: "stopped", type: "process", label: "Stopped" });
    graph.edges.push({ id: "to-stopped", source: "start", target: "stopped" });

    expect(codesFor(graph, "stopped")).toEqual(["dead-end"]);
  });

  it("reports branch count and every unlabelled Decision connection separately", () => {
    const graph = completeGraph();
    graph.nodes.push({ id: "choice", type: "decision", label: "Approved?" });
    graph.edges = [
      { id: "to-choice", source: "start", target: "choice" },
      { id: "yes", source: "choice", target: "end" },
    ];

    const issues = auditGraph(graph).filter(issue => issue.target.focusNodeId === "choice");
    expect(issues.map(issue => issue.code)).toEqual(["decision-branch-count", "unlabeled-decision-branch"]);
    expect(issues[1].target).toEqual({ kind: "edge", edgeId: "yes", focusNodeId: "choice" });
  });

  it("reports reachable nodes whose paths cannot reach an End", () => {
    const graph = completeGraph();
    graph.nodes.push(
      { id: "a", type: "process", label: "Loop A" },
      { id: "b", type: "process", label: "Loop B" },
    );
    graph.edges.push(
      { id: "to-a", source: "start", target: "a" },
      { id: "a-b", source: "a", target: "b" },
      { id: "b-a", source: "b", target: "a" },
    );

    expect(codesFor(graph, "a")).toEqual(["no-route-to-end"]);
    expect(codesFor(graph, "b")).toEqual(["no-route-to-end"]);
  });

  it("reports duplicate labels after trimming and case folding", () => {
    const graph = completeGraph();
    graph.nodes.push(
      { id: "a", type: "process", label: " Review " },
      { id: "b", type: "process", label: "review" },
    );
    graph.edges.push(
      { id: "to-a", source: "start", target: "a" },
      { id: "a-b", source: "a", target: "b" },
      { id: "b-end", source: "b", target: "end" },
    );

    const duplicate = auditGraph(graph).find(issue => issue.code === "duplicate-label");
    expect(duplicate).toMatchObject({
      id: "label:review:duplicate",
      severity: "review",
      target: { kind: "node", nodeId: "a", focusNodeId: "a" },
    });
  });

  it("is deterministic and does not mutate input order", () => {
    const graph = completeGraph();
    graph.nodes.push({ id: "island", type: "process", label: "Island" });
    graph.nodes.reverse();
    graph.edges.reverse();
    const before = structuredClone(graph);

    const first = auditGraph(graph);
    const second = auditGraph({ ...graph, nodes: [...graph.nodes].reverse(), edges: [...graph.edges].reverse() });

    expect(first).toEqual(second);
    expect(graph).toEqual(before);
  });

  it("ignores dangling connection references instead of throwing", () => {
    const graph = completeGraph();
    graph.edges.push(
      { id: "missing-source", source: "missing", target: "end" },
      { id: "missing-target", source: "start", target: "missing" },
    );

    expect(auditGraph(graph)).toEqual([]);
  });
});
