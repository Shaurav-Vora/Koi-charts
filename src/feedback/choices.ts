import type { FlowGraph } from "../graph/types";

/**
 * How an ambiguous reference is offered to the author. Never by ID: a node ID is a UUID, and a
 * reply that reads one aloud is both unusable and long enough to hold the microphone shut while
 * it plays. The choices are numbered instead, because a number is short, unambiguous by ear, and
 * something the author can say straight back.
 */
export const choiceWords = ["one", "two", "three"] as const;
const counts = ["", "One", "Two", "Three"];

/** What each candidate is called when it is offered or shown on a button. */
export function choiceLabels(graph: FlowGraph, candidates: string[], elementKind: "node" | "edge"): string[] {
  return candidates.slice(0, choiceWords.length).map(id => {
    if (elementKind === "node") return graph.nodes.find(node => node.id === id)?.label ?? "Unnamed shape";
    const edge = graph.edges.find(item => item.id === id);
    if (!edge) return "Unnamed connection";
    const ends = `${graph.nodes.find(node => node.id === edge.source)?.label} to ${graph.nodes.find(node => node.id === edge.target)?.label}`;
    return edge.label ? `${edge.label}, ${ends}` : ends;
  });
}

export function describeChoices(graph: FlowGraph, candidates: string[], elementKind: "node" | "edge"): string {
  const labels = choiceLabels(graph, candidates, elementKind);
  const options = labels.map((label, index) => `${choiceWords[index]} for ${label}`);
  const list = options.length > 1 ? `${options.slice(0, -1).join(", ")}, or ${options.at(-1)}` : options[0];
  const noun = elementKind === "node" ? "shapes" : "connections";
  const total = candidates.length > 3 ? "Several" : counts[candidates.length];
  // A shape the author cannot name is one they should rename, not one they should count past.
  const overflow = candidates.length > choiceWords.length ? " More match; say the exact label to choose another." : "";
  return `${total} ${noun} match. Say ${list}.${overflow}`;
}
