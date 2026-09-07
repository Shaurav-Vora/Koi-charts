// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeChart, inspectNode, describeTrace } from "./describe";
import { graphFixture } from "../test/fixtures";

describe("nonvisual descriptions", () => {
  it("describes an empty chart clearly", () => { expect(describeChart({ schemaVersion: 1, nodes: [], edges: [] })).toBe("The chart is empty."); });
  it("summarizes chart size, nodes, types, and labeled connections", () => {
    const text = describeChart(graphFixture());
    expect(text).toContain("4 nodes and 3 connections"); expect(text).toContain('"Begin" (start)');
    expect(text).toContain('"Payment approved" (decision)'); expect(text).toContain('label "yes"');
  });
  it("inspects the node with incoming and outgoing context", () => {
    const text = inspectNode(graphFixture(), "n3");
    expect(text).toContain('"Payment approved" (decision)'); expect(text).toContain('Incoming: "Validate card"');
    expect(text).toContain('Outgoing: "Show receipt"'); expect(text).toContain('label "yes"');
  });
  it("reports no connections without omitting node identity", () => {
    const graph = graphFixture(); graph.edges = [];
    expect(inspectNode(graph, "n2")).toContain("No incoming connections. No outgoing connections.");
  });
  it("rejects an unknown inspected node", () => { expect(() => inspectNode(graphFixture(), "missing")).toThrow(/not found/i); });
  it("describes an ordered route and its branch label", () => {
    const text = describeTrace(graphFixture(), "n1", "n4");
    expect(text).toContain('"Begin" (start)'); expect(text).toContain('label "yes"'); expect(text).toContain("Reached the requested target.");
    expect(text.indexOf('"Validate card"')).toBeLessThan(text.indexOf('"Payment approved"'));
  });
  it("explains why tracing stopped at a branch", () => {
    const graph = graphFixture(); graph.edges.push({ id: "no", source: "n3", target: "n2", label: "no" });
    expect(describeTrace(graph, "n1")).toContain("Stopped at a branch with 2 outgoing connections. Specify a target to trace further.");
  });
  it("explains a cycle stop", () => {
    const graph = graphFixture(); graph.edges = [{ id: "a", source: "n1", target: "n2" }, { id: "b", source: "n2", target: "n1" }];
    expect(describeTrace(graph, "n1")).toContain("Stopped at a previously visited node (cycle).");
  });
  it("distinguishes an end node from a dead end", () => {
    expect(describeTrace(graphFixture(), "n1")).toContain("Reached an end node.");
    const graph = graphFixture(); graph.edges = [];
    expect(describeTrace(graph, "n2")).toContain("Stopped because this node has no outgoing connections.");
  });
  it("explains that an existing target is unreachable", () => {
    expect(describeTrace(graphFixture(), "n4", "n1")).toContain("No directed path");
  });
  it("renders deterministically without changing input", () => {
    const graph = graphFixture(); graph.nodes.reverse(); graph.edges.reverse(); const before = structuredClone(graph);
    expect(describeChart(graph)).toBe(describeChart(graphFixture())); expect(graph).toEqual(before);
  });
});
