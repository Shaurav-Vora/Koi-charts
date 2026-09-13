// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import { auditTransition, createAuditState } from "./state";

const empty: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };

describe("audit state", () => {
  it("opens at the first issue and navigates without changing the graph", () => {
    const opened = auditTransition(empty, createAuditState(), { type: "open", graphVersion: 0 });
    const next = auditTransition(empty, opened, { type: "next", graphVersion: 0 });
    const previous = auditTransition(empty, next, { type: "previous", graphVersion: 0 });

    expect(opened).toMatchObject({ status: "open", currentIssueId: "chart:missing-start", graphVersion: 0 });
    expect(next.currentIssueId).toBe("chart:missing-end");
    expect(previous.currentIssueId).toBe("chart:missing-start");
    expect(empty).toEqual({ schemaVersion: 1, nodes: [], edges: [] });
  });

  it("keeps the current stable issue when the graph changes", () => {
    const opened = auditTransition(empty, createAuditState(), { type: "open", graphVersion: 0 });
    const onEndIssue = auditTransition(empty, opened, { type: "next", graphVersion: 0 });
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [{ id: "start", type: "start", label: "Begin" }],
      edges: [],
    };

    const updated = auditTransition(graph, onEndIssue, { type: "graph_changed", graphVersion: 1 });

    expect(updated.currentIssueId).toBe("chart:missing-end");
    expect(updated.issues.map(issue => issue.code)).toEqual(["missing-end", "dead-end"]);
  });

  it("moves to the next remaining issue when the current issue is resolved", () => {
    const opened = auditTransition(empty, createAuditState(), { type: "open", graphVersion: 0 });
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [{ id: "start", type: "start", label: "Begin" }],
      edges: [],
    };

    const updated = auditTransition(graph, opened, { type: "graph_changed", graphVersion: 1 });

    expect(updated.currentIssueId).toBe("chart:missing-end");
    expect(updated.message).toBe("Issue resolved. Next: Add an End node.");
  });

  it("keeps the clear result open and closes only when requested", () => {
    const complete: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "start", type: "start", label: "Begin" },
        { id: "end", type: "end", label: "Finish" },
      ],
      edges: [{ id: "finish", source: "start", target: "end" }],
    };
    const opened = auditTransition(complete, createAuditState(), { type: "open", graphVersion: 4 });
    const repeated = auditTransition(complete, opened, { type: "repeat", graphVersion: 4 });
    const closed = auditTransition(complete, repeated, { type: "close", graphVersion: 4 });

    expect(opened).toMatchObject({ status: "open", issues: [], currentIssueId: null, message: "Check complete. No issues found." });
    expect(repeated.message).toBe("Check complete. No issues found.");
    expect(closed).toEqual(createAuditState());
  });
});
