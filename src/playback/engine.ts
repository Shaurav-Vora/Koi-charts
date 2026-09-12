import { assertGraph } from "../graph/invariants";
import type { FlowEdge, FlowGraph, FlowNode } from "../graph/types";
import type { PlaybackAction, PlaybackChoice, PlaybackRouteStep, PlaybackState } from "./types";

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
const changedMessage = "The chart changed. Restart the test to use the updated structure.";

export function createPlaybackState(): PlaybackState {
  return {
    status: "idle",
    graphVersion: null,
    currentNodeId: null,
    route: [],
    choices: [],
    warnings: [],
    visitCounts: {},
    message: "No chart test is running.",
  };
}

function reachableNodeIds(graph: FlowGraph, starts: FlowNode[]): Set<string> {
  const reached = new Set(starts.map(node => node.id));
  const queue = [...reached];
  for (let index = 0; index < queue.length; index++) {
    for (const edge of graph.edges.filter(item => item.source === queue[index]).sort(byId)) {
      if (reached.has(edge.target)) continue;
      reached.add(edge.target);
      queue.push(edge.target);
    }
  }
  return reached;
}

function playbackWarnings(graph: FlowGraph, starts: FlowNode[]): string[] {
  const warnings: string[] = [];
  if (!graph.nodes.some(node => node.type === "end")) warnings.push("No End node.");
  if (starts.length) {
    const reached = reachableNodeIds(graph, starts);
    const unreachable = graph.nodes.filter(node => !reached.has(node.id)).sort(byId).map(node => node.label);
    if (unreachable.length) warnings.push("Unreachable nodes: " + unreachable.join(", ") + ".");
  }
  for (const decision of graph.nodes.filter(node => node.type === "decision").sort(byId)) {
    const outgoing = graph.edges.filter(edge => edge.source === decision.id).sort(byId);
    if (outgoing.length < 2) warnings.push("Decision " + decision.label + " has fewer than two outgoing branches.");
    for (const edge of outgoing.filter(item => !item.label?.trim())) {
      const target = graph.nodes.find(node => node.id === edge.target);
      if (target) warnings.push("Decision " + decision.label + " has an unlabelled branch to " + target.label + ".");
    }
    const labels = new Map<string, string[]>();
    for (const edge of outgoing) {
      const label = edge.label?.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase();
      labels.set(key, [...(labels.get(key) ?? []), label]);
    }
    for (const repeated of labels.values()) {
      if (repeated.length > 1) warnings.push("Decision " + decision.label + " repeats the branch label " + repeated[0] + ".");
    }
  }
  return warnings;
}

function startChoice(node: FlowNode): PlaybackChoice {
  return { id: node.id, label: node.label, destinationLabel: node.label };
}

function edgeChoice(graph: FlowGraph, edge: FlowEdge): PlaybackChoice {
  const destination = graph.nodes.find(node => node.id === edge.target);
  const destinationLabel = destination?.label ?? "missing destination";
  const edgeLabel = edge.label?.trim();
  return {
    id: edge.id,
    label: (edgeLabel || "Unlabelled") + " to " + destinationLabel,
    destinationLabel,
  };
}

function currentMessage(graph: FlowGraph, state: PlaybackState): string {
  const node = graph.nodes.find(item => item.id === state.currentNodeId);
  if (!node) return changedMessage;
  if (state.status === "complete") return "Reached " + node.label + ". Test complete.";
  if (state.status === "choosing_branch") return "Choose a branch from " + node.label + ".";
  return node.label + ", " + node.type + ". Ready for the next step.";
}

function enterNode(
  graph: FlowGraph,
  state: PlaybackState,
  nodeId: string,
  viaEdgeId: string | null,
): PlaybackState {
  const node = graph.nodes.find(item => item.id === nodeId);
  if (!node) return { ...state, status: "blocked", choices: [], message: changedMessage };
  const revisited = (state.visitCounts[nodeId] ?? 0) > 0;
  const route = [...state.route, { nodeId, viaEdgeId }];
  const visitCounts = { ...state.visitCounts, [nodeId]: (state.visitCounts[nodeId] ?? 0) + 1 };
  const complete = node.type === "end";
  return {
    ...state,
    status: complete ? "complete" : "paused",
    currentNodeId: node.id,
    route,
    choices: [],
    visitCounts,
    message: complete
      ? "Reached " + node.label + ". Test complete."
      : revisited
        ? "Loop detected at " + node.label + ". Ready for the next step."
        : node.label + ", " + node.type + ". Ready for the next step.",
  };
}

function begin(graph: FlowGraph, graphVersion: number): PlaybackState {
  const starts = graph.nodes.filter(node => node.type === "start").sort(byId);
  const base = {
    ...createPlaybackState(),
    graphVersion,
    warnings: playbackWarnings(graph, starts),
  };
  if (!starts.length) return { ...base, status: "blocked", message: "Add a Start node before testing." };
  if (starts.length > 1) {
    return {
      ...base,
      status: "choosing_start",
      choices: starts.map(startChoice),
      message: "Choose which Start node to test.",
    };
  }
  return enterNode(graph, base, starts[0].id, null);
}

function countsFor(route: PlaybackRouteStep[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const step of route) counts[step.nodeId] = (counts[step.nodeId] ?? 0) + 1;
  return counts;
}

export function playbackTransition(
  graph: FlowGraph,
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  assertGraph(graph);
  if (action.type === "stop") return createPlaybackState();
  if (action.type === "start" || action.type === "restart") return begin(graph, action.graphVersion);
  if (state.status === "idle") return { ...state, message: "Start Test chart mode first." };
  if (state.graphVersion !== action.graphVersion || action.type === "graph_changed") {
    return { ...state, status: "blocked", choices: [], message: changedMessage };
  }

  if (action.type === "choose_start") {
    const offered = state.status === "choosing_start" && state.choices.some(choice => choice.id === action.nodeId);
    const start = offered ? graph.nodes.find(node => node.id === action.nodeId && node.type === "start") : undefined;
    return start
      ? enterNode(graph, { ...state, route: [], visitCounts: {} }, start.id, null)
      : { ...state, message: "Choose one of the listed Start nodes." };
  }

  if (action.type === "choose_branch") {
    const offered = state.status === "choosing_branch" && state.choices.some(choice => choice.id === action.edgeId);
    const edge = offered ? graph.edges.find(item => item.id === action.edgeId && item.source === state.currentNodeId) : undefined;
    return edge
      ? enterNode(graph, state, edge.target, edge.id)
      : { ...state, message: "Choose one of the listed branches." };
  }

  if (action.type === "back") {
    if (state.route.length <= 1) return { ...state, status: "paused", choices: [], message: "Already at the first playback step." };
    const route = state.route.slice(0, -1);
    const currentNodeId = route.at(-1)!.nodeId;
    const node = graph.nodes.find(item => item.id === currentNodeId);
    if (!node) return { ...state, status: "blocked", choices: [], message: changedMessage };
    return {
      ...state,
      status: "paused",
      currentNodeId,
      route,
      choices: [],
      visitCounts: countsFor(route),
      message: node.label + ". Moved back one step.",
    };
  }

  if (action.type === "repeat") return { ...state, message: currentMessage(graph, state) };

  if (action.type === "next") {
    if (state.status === "complete") return { ...state, message: currentMessage(graph, state) };
    if (state.status === "choosing_start") return { ...state, message: "Choose one of the listed Start nodes." };
    if (state.status === "choosing_branch") return { ...state, message: currentMessage(graph, state) };
    if (state.status === "blocked" || !state.currentNodeId) return state;
    const node = graph.nodes.find(item => item.id === state.currentNodeId);
    if (!node) return { ...state, status: "blocked", choices: [], message: changedMessage };
    const outgoing = graph.edges.filter(edge => edge.source === node.id).sort(byId);
    if (!outgoing.length) {
      return {
        ...state,
        status: "blocked",
        choices: [],
        message: node.label + " is a dead end. Add an outgoing connection or stop the test.",
      };
    }
    if (outgoing.length === 1) return enterNode(graph, state, outgoing[0].target, outgoing[0].id);
    const choices = outgoing.map(edge => edgeChoice(graph, edge)).sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    return {
      ...state,
      status: "choosing_branch",
      choices,
      message: "Choose a branch from " + node.label + ".",
    };
  }

  return state;
}

export type { PlaybackAction, PlaybackChoice, PlaybackRouteStep, PlaybackState, PlaybackStatus } from "./types";
