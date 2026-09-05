import type { Snapshot } from "../graph/types";
import type { SpokenRef } from "./schema";

export type NodeResolution = { kind: "resolved"; id: string } | { kind: "ambiguous"; ids: string[] } | { kind: "missing" };
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
function matches(ids: string[]): NodeResolution {
  if (ids.length === 0) return { kind: "missing" };
  return ids.length === 1 ? { kind: "resolved", id: ids[0] } : { kind: "ambiguous", ids: [...ids].sort() };
}
function similarity(a: string, b: string): number {
  const left = Array.from(a), right = Array.from(b);
  let row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 0; i < left.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < right.length; j++) {
      next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (left[i] === right[j] ? 0 : 1)));
    }
    row = next;
  }
  return 1 - row[right.length] / Math.max(left.length, right.length, 1);
}

export function resolveNode(state: Snapshot, ref: SpokenRef): NodeResolution {
  const existing = (id: string | null) => matches(state.graph.nodes.filter(node => node.id === id).map(node => node.id));
  if (ref.kind === "id") return existing(ref.value);
  if (ref.kind === "focus") return existing(state.focusedNodeId);
  if (ref.kind === "recent") return existing(state.recentNodeId);
  const exact = state.graph.nodes.filter(node => node.label.toLowerCase() === ref.value.toLowerCase());
  if (exact.length) return matches(exact.map(node => node.id));
  const query = normalize(ref.value);
  if (["this", "it", "this node"].includes(query)) return existing(state.focusedNodeId);
  if (!query) return { kind: "missing" };
  const normalized = state.graph.nodes.filter(node => normalize(node.label) === query);
  if (normalized.length) return matches(normalized.map(node => node.id));
  const ranked = state.graph.nodes.map(node => ({ id: node.id, score: similarity(query, normalize(node.label)) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (ranked[0]?.score >= 0.9) {
    const close = ranked.filter(candidate => ranked[0].score - candidate.score < 0.1 - Number.EPSILON);
    return matches(close.map(candidate => candidate.id));
  }
  if (["the node i just added", "the node i just changed", "the node i just edited"].includes(query)) return existing(state.recentNodeId);
  return { kind: "missing" };
}
