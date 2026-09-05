import { assertGraph } from "./invariants";
import type { FlowGraph } from "./types";

/** Authoring warnings are separate from graph-integrity errors. */
export function validateGraph(graph: FlowGraph): string[] {
  assertGraph(graph);
  const nodes = [...graph.nodes].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const starts = nodes.filter(node => node.type === "start");
  const warnings: string[] = [];
  if (!starts.length) warnings.push("No start node.");
  if (!nodes.some(node => node.type === "end")) warnings.push("No end node.");
  if (starts.length) {
    const reachable = new Set(starts.map(node => node.id));
    const queue = [...reachable];
    for (let i = 0; i < queue.length; i++) {
      for (const edge of graph.edges.filter(edge => edge.source === queue[i])) {
        if (!reachable.has(edge.target)) { reachable.add(edge.target); queue.push(edge.target); }
      }
    }
    for (const node of nodes) {
      if (!reachable.has(node.id)) warnings.push(`Unreachable from any start node: "${node.label}" (${node.id}).`);
    }
  }
  for (const node of nodes.filter(node => node.type === "decision")) {
    const outgoing = graph.edges.filter(edge => edge.source === node.id).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    if (outgoing.length < 2) warnings.push(`Decision "${node.label}" (${node.id}) has fewer than two outgoing branches.`);
    for (const edge of outgoing) {
      if (!edge.label) warnings.push(`Decision "${node.label}" (${node.id}) has an unlabeled outgoing connection (${edge.id}).`);
    }
  }
  return warnings;
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
