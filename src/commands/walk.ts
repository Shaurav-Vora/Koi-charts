import type { CommandResult, EngineState, FlowEdge, FlowGraph, FlowNode } from "../graph/types";
import type { GraphCommand } from "./schema";

const byId = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const name = (node: FlowNode) => `"${node.label}" (${node.type})`;
const count = (amount: number, noun: string) => `${amount} ${noun}${amount === 1 ? "" : "s"}`;

/**
 * What a sighted user takes in at a glance: where the cursor stands, and every way out of it.
 * Spoken after each step so the walk never depends on remembering the shape of the chart.
 */
export function reportPosition(graph: FlowGraph, node: FlowNode): string {
  const nodeById = new Map(graph.nodes.map(item => [item.id, item]));
  const outgoing = graph.edges.filter(edge => edge.source === node.id).sort(byId);
  const incoming = graph.edges.filter(edge => edge.target === node.id).sort(byId);
  if (!outgoing.length && !incoming.length) return `${name(node)}. Nothing attached.`;
  const step = (edge: FlowEdge, otherId: string, preposition: string) =>
    `${edge.label ? `"${edge.label}" ` : ""}${preposition} "${nodeById.get(otherId)!.label}"`;
  const onward = outgoing.length
    ? `${count(outgoing.length, "way")} onward: ${outgoing.map(edge => step(edge, edge.target, "to")).join(", ")}`
    : "No connections lead onward";
  const back = incoming.length
    ? `${count(incoming.length, "way")} back: ${incoming.map(edge => step(edge, edge.source, "from")).join(", ")}`
    : "Nothing leads here";
  return `${name(node)}. ${onward}. ${back}.`;
}

/** Moving the cursor is not an edit: the graph, the version and the history are untouched. */
export function walkCommand(state: EngineState, input: GraphCommand): CommandResult | null {
  if (input.kind !== "walk") return null;
  const { graph } = state;
  const ordered = [...graph.nodes].sort(byId);
  const explored = (message: string): CommandResult => ({ state, outcome: "explored", message });
  const failure = (message: string): CommandResult => ({ state, outcome: "error", message });
  const move = (node: FlowNode, note = ""): CommandResult =>
    ({ state: { ...state, focusedNodeId: node.id }, outcome: "focused", message: `${note}${reportPosition(graph, node)}` });

  if (input.direction === "first" || input.direction === "last") {
    if (!ordered.length) return failure("The chart is empty. Add a shape first.");
    const wanted = input.direction === "first" ? "start" : "end";
    const match = input.direction === "first" ? ordered.find(node => node.type === wanted) : ordered.findLast(node => node.type === wanted);
    // Falling back keeps the command useful on a half-built chart, but says why it landed here.
    return move(match ?? (input.direction === "first" ? ordered[0] : ordered.at(-1)!), match ? "" : `The chart has no ${wanted} node. `);
  }

  const current = graph.nodes.find(node => node.id === state.focusedNodeId);
  if (!current) return failure(`No node is focused. Say "go to start", or focus a node by name.`);
  if (input.direction === "stay") return explored(reportPosition(graph, current));

  const forward = input.direction === "next";
  const edges = graph.edges.filter(edge => (forward ? edge.source : edge.target) === current.id).sort(byId);
  const beyond = (edge: FlowEdge) => graph.nodes.find(node => node.id === (forward ? edge.target : edge.source))!;
  // A dead end is where the path ends, not a mistake: report the position and stand still.
  if (!edges.length) return explored(reportPosition(graph, current));
  if (edges.length === 1) return move(beyond(edges[0]));
  // Choosing a branch for someone who cannot see where it leads would be guessing on their behalf.
  if (input.branch === null) return explored(`${reportPosition(graph, current)} Say "take" and the name to choose.`);

  const wanted = input.branch.trim().toLowerCase();
  const labelled = edges.filter(edge => (edge.label ?? "").toLowerCase() === wanted);
  if (labelled.length > 1) return failure(`More than one connection here is called "${input.branch}". Name the shape it leads to instead. ${reportPosition(graph, current)}`);
  const named = edges.filter(edge => beyond(edge).label.toLowerCase() === wanted);
  if (!labelled.length && named.length > 1) return failure(`More than one connection here leads to "${input.branch}". ${reportPosition(graph, current)}`);
  const chosen = labelled[0] ?? named[0];
  if (!chosen) return failure(`Nothing here is called "${input.branch}". ${reportPosition(graph, current)}`);
  return move(beyond(chosen));
}
