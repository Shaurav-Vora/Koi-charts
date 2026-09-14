import { assertGraph } from "./invariants";
import type { FlowGraph } from "./types";
import { auditGraph } from "../audit/engine";
import type { AuditIssue } from "../audit/types";

function diagnosticMessage(graph: FlowGraph, issue: AuditIssue): string {
  const node = issue.target.focusNodeId
    ? graph.nodes.find(candidate => candidate.id === issue.target.focusNodeId)
    : undefined;
  switch (issue.code) {
    case "unreachable-node": return node ? `Unreachable from any start node: "${node.label}" (${node.id}).` : issue.message;
    case "dead-end": return node ? `Non-end node "${node.label}" (${node.id}) has no outgoing connection.` : issue.message;
    case "decision-branch-count": return node ? `Decision "${node.label}" (${node.id}) has fewer than two outgoing branches.` : issue.message;
    case "multiple-starts": return "More than one start node.";
    case "unlabeled-decision-branch": return node && issue.target.kind === "edge"
      ? `Decision "${node.label}" (${node.id}) has an unlabeled outgoing connection (${issue.target.edgeId}).`
      : issue.message;
    case "no-route-to-end": return node ? `Node "${node.label}" (${node.id}) cannot reach an end node.` : issue.message;
    default: return issue.message;
  }
}

/** Authoring warnings are separate from graph-integrity errors. */
export function validateGraph(graph: FlowGraph): string[] {
  const seenCodes = new Set<AuditIssue["code"]>();
  return auditGraph(graph).flatMap(issue => {
    if (issue.code === "multiple-starts" && seenCodes.has(issue.code)) return [];
    seenCodes.add(issue.code);
    return [diagnosticMessage(graph, issue)];
  });
}

/** With a target, find one shortest directed route. Without one, never choose a branch. */
export function tracePath(graph: FlowGraph, startId: string, endId?: string): string[] {
  assertGraph(graph);
  const nodes = new Map(graph.nodes.map(node => [node.id, node]));
  if (!nodes.has(startId)) throw new Error(`Start node not found: ${startId}. Choose an existing node.`);
  if (endId !== undefined && !nodes.has(endId)) throw new Error(`Target node not found: ${endId}. Choose an existing node.`);
  if (endId !== undefined) {
    const queue = [startId];
    const previous = new Map<string, string | null>([[startId, null]]);
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i];
      if (current === endId) {
        const path: string[] = [];
        let cursor: string | null = current;
        while (cursor !== null) { path.push(cursor); cursor = previous.get(cursor)!; }
        return path.reverse();
      }
      const successors = [...new Set(graph.edges.filter(edge => edge.source === current).map(edge => edge.target))].sort();
      for (const target of successors) {
        if (!previous.has(target)) { previous.set(target, current); queue.push(target); }
      }
    }
    return [];
  }
  const path = [startId], visited = new Set([startId]);
  let current = startId;
  while (nodes.get(current)!.type !== "end") {
    const outgoing = graph.edges.filter(edge => edge.source === current);
    if (outgoing.length !== 1) break;
    current = outgoing[0].target; path.push(current);
    if (visited.has(current)) break;
    visited.add(current);
  }
  return path;
}
