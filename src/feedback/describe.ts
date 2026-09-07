import { assertGraph } from "../graph/invariants";
import { tracePath } from "../graph/queries";
import type { FlowEdge, FlowGraph, FlowNode } from "../graph/types";

const byId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
// Descriptions are heard far more often than they are read, and a UUID read aloud is both
// meaningless and long enough to hold the microphone shut while it plays. Labels are unique
// (see uniqueLabel), so a label and a shape name one another.
const identity = (node: FlowNode) => `"${node.label}" (${node.type})`;
const edgeLabel = (edge: FlowEdge) => edge.label === undefined ? "unlabeled" : `label "${edge.label}"`;
const count = (amount: number, noun: string) => `${amount} ${noun}${amount === 1 ? "" : "s"}`;
function getNode(graph: FlowGraph, id: string): FlowNode {
  const node = graph.nodes.find(node => node.id === id);
  if (!node) throw new Error(`Node not found: ${id}. Choose an existing node.`);
  return node;
}

export function describeChart(graph: FlowGraph): string {
  assertGraph(graph);
  if (!graph.nodes.length) return "The chart is empty.";
  const nodes = [...graph.nodes].sort(byId).map(identity).join("; ");
  const edges = [...graph.edges].sort(byId).map(edge =>
    `"${getNode(graph, edge.source).label}" to "${getNode(graph, edge.target).label}", ${edgeLabel(edge)}`).join("; ");
  return `The chart has ${count(graph.nodes.length, "node")} and ${count(graph.edges.length, "connection")}. Nodes: ${nodes}. ${edges ? `Connections: ${edges}.` : "No connections yet."}`;
}

export function inspectNode(graph: FlowGraph, nodeId: string): string {
  assertGraph(graph);
  const node = getNode(graph, nodeId);
  const incoming = graph.edges.filter(edge => edge.target === nodeId).sort(byId)
    .map(edge => `${identity(getNode(graph, edge.source))}, ${edgeLabel(edge)}`);
  const outgoing = graph.edges.filter(edge => edge.source === nodeId).sort(byId)
    .map(edge => `${identity(getNode(graph, edge.target))}, ${edgeLabel(edge)}`);
  return `${identity(node)}. ${incoming.length ? `Incoming: ${incoming.join("; ")}.` : "No incoming connections."} ${outgoing.length ? `Outgoing: ${outgoing.join("; ")}.` : "No outgoing connections."}`;
}

export function describeTrace(graph: FlowGraph, startId: string, endId?: string): string {
  const path = tracePath(graph, startId, endId);
  if (!path.length) return `No directed path from ${identity(getNode(graph, startId))} to ${identity(getNode(graph, endId!))}. Check the connections or choose another target.`;
  let text = `Path: ${identity(getNode(graph, path[0]))}`;
  for (let index = 1; index < path.length; index++) {
    // Parallel connections to the same target are selected deterministically by edge ID.
    const edge = graph.edges.filter(edge => edge.source === path[index - 1] && edge.target === path[index]).sort(byId)[0];
    text += `; via ${edgeLabel(edge)} connection to ${identity(getNode(graph, path[index]))}`;
  }
  const last = getNode(graph, path.at(-1)!);
  let stop: string;
  if (endId !== undefined) stop = "Reached the requested target.";
  else if (new Set(path).size !== path.length) stop = "Stopped at a previously visited node (cycle).";
  else if (last.type === "end") stop = "Reached an end node.";
  else {
    const outgoingCount = graph.edges.filter(edge => edge.source === last.id).length;
    stop = outgoingCount > 1 ? `Stopped at a branch with ${outgoingCount} outgoing connections. Specify a target to trace further.` : "Stopped because this node has no outgoing connections.";
  }
  return `${text}. ${stop}`;
}
