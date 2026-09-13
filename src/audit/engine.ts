import type { FlowEdge, FlowGraph, FlowNode, NodeId } from "../graph/types";
import type { AuditIssue, AuditSeverity, AuditTarget } from "./types";

const chartTarget = { kind: "chart", focusNodeId: null } as const;
const byId = <T extends { id: string }>(left: T, right: T) => left.id.localeCompare(right.id);

function issue(
  id: string,
  code: AuditIssue["code"],
  severity: AuditSeverity,
  title: string,
  message: string,
  suggestion: string,
  target: AuditTarget,
): AuditIssue {
  return { id, code, severity, title, message, suggestion, target };
}

const nodeTarget = (nodeId: NodeId): AuditTarget => ({ kind: "node", nodeId, focusNodeId: nodeId });
const edgeTarget = (edgeId: string, nodeId: NodeId): AuditTarget => ({ kind: "edge", edgeId, focusNodeId: nodeId });

function visit(starts: Iterable<NodeId>, adjacency: ReadonlyMap<NodeId, readonly NodeId[]>): Set<NodeId> {
  const visited = new Set(starts);
  const queue = [...visited];
  for (let index = 0; index < queue.length; index++) {
    for (const next of adjacency.get(queue[index]) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

function adjacencyFor(nodes: readonly FlowNode[], edges: readonly FlowEdge[], reverse = false) {
  const adjacency = new Map<NodeId, NodeId[]>(nodes.map(node => [node.id, []]));
  for (const edge of edges) {
    const source = reverse ? edge.target : edge.source;
    const target = reverse ? edge.source : edge.target;
    adjacency.get(source)?.push(target);
  }
  for (const targets of adjacency.values()) targets.sort();
  return adjacency;
}

export function auditGraph(graph: FlowGraph): AuditIssue[] {
  const nodes = [...graph.nodes].sort(byId);
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = graph.edges
    .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .sort(byId);
  const outgoing = new Map(nodes.map(node => [node.id, edges.filter(edge => edge.source === node.id)]));
  const starts = nodes.filter(node => node.type === "start");
  const ends = nodes.filter(node => node.type === "end");
  const issues: AuditIssue[] = [];

  if (!starts.length) {
    issues.push(issue(
      "chart:missing-start", "missing-start", "required", "Add a Start node", "No start node.",
      "Add one Start node to show where the flow begins.", chartTarget,
    ));
  }
  if (starts.length > 1) {
    issues.push(issue(
      "chart:multiple-starts", "multiple-starts", "required", "Choose one Start node", "More than one start node.",
      "Keep one Start node so the flow has a clear entry point.", chartTarget,
    ));
  }
  if (!ends.length) {
    issues.push(issue(
      "chart:missing-end", "missing-end", "required", "Add an End node", "No end node.",
      "Add at least one End node to show where the flow can finish.", chartTarget,
    ));
  }

  const forward = adjacencyFor(nodes, edges);
  const reachable = starts.length ? visit(starts.map(node => node.id), forward) : new Set<NodeId>();
  if (starts.length) {
    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        issues.push(issue(
          `node:${node.id}:unreachable`, "unreachable-node", "required", "Connect this node to the flow",
          `Unreachable from any start node: "${node.label}" (${node.id}).`,
          "Connect this node to a path that begins at the Start node.", nodeTarget(node.id),
        ));
      }
    }
  }

  const deadEnds = new Set<NodeId>();
  for (const node of nodes) {
    if (node.type !== "end" && !(outgoing.get(node.id)?.length ?? 0)) {
      deadEnds.add(node.id);
      issues.push(issue(
        `node:${node.id}:dead-end`, "dead-end", "required", "Continue or end this path",
        `Non-end node "${node.label}" (${node.id}) has no outgoing connection.`,
        "Connect this node to the next step or change it to an End node.", nodeTarget(node.id),
      ));
    }
  }

  for (const node of nodes.filter(candidate => candidate.type === "decision")) {
    const branches = outgoing.get(node.id) ?? [];
    if (branches.length < 2) {
      issues.push(issue(
        `node:${node.id}:decision-branch-count`, "decision-branch-count", "required", "Add another decision branch",
        `Decision "${node.label}" (${node.id}) has fewer than two outgoing branches.`,
        "Connect the decision to at least two possible outcomes.", nodeTarget(node.id),
      ));
    }
    for (const edge of branches) {
      if (!edge.label?.trim()) {
        issues.push(issue(
          `edge:${edge.id}:unlabeled-decision-branch`, "unlabeled-decision-branch", "review", "Label this decision branch",
          `Decision "${node.label}" (${node.id}) has an unlabeled outgoing connection (${edge.id}).`,
          "Add a short outcome label such as Yes or No.", edgeTarget(edge.id, node.id),
        ));
      }
    }
  }

  if (starts.length && ends.length) {
    const canReachEnd = visit(ends.map(node => node.id), adjacencyFor(nodes, edges, true));
    for (const node of nodes) {
      if (
        node.type !== "end"
        && reachable.has(node.id)
        && !deadEnds.has(node.id)
        && !canReachEnd.has(node.id)
      ) {
        issues.push(issue(
          `node:${node.id}:no-route-to-end`, "no-route-to-end", "required", "Create a route to an End node",
          `Node "${node.label}" (${node.id}) cannot reach an end node.`,
          "Connect this path to a node that can eventually reach an End node.", nodeTarget(node.id),
        ));
      }
    }
  }

  const labels = new Map<string, FlowNode[]>();
  for (const node of nodes) {
    const normalized = node.label.trim().toLowerCase();
    labels.set(normalized, [...(labels.get(normalized) ?? []), node]);
  }
  for (const [normalized, matches] of [...labels.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (matches.length < 2) continue;
    const first = matches[0];
    issues.push(issue(
      `label:${encodeURIComponent(normalized)}:duplicate`, "duplicate-label", "review", "Use a distinct node label",
      `More than one node is labelled "${first.label.trim()}".`,
      "Rename these nodes so voice and keyboard commands can identify each one clearly.", nodeTarget(first.id),
    ));
  }

  return issues;
}
