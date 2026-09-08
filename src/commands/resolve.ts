import type { Snapshot } from "../graph/types";
import { TYPE_WORDS } from "../graph/type-words";
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

/**
 * Words that surround a name in speech without being part of it: "delete the Review node",
 * "delete the node called Review", "delete the process Review". Stripping them is only ever a
 * second attempt — a shape actually labelled "Review node" matches exactly first, so relaxing
 * can never take a name away from the shape that really has it.
 */
const LEADING = new Set(["the", "a", "an", "node", "shape", "box", "called", "named", "labeled", "labelled", "titled",
  "start", "process", "decision", "end", "step", "task", "action", "choice", "question"]);
const TRAILING = new Set(["node", "shape", "box"]);
/**
 * Every progressively shorter reading, in order, rather than only the shortest. "The process 3"
 * is the third of a numbered repeat, so stripping to the end would take "process" off a name it
 * belongs to; trying "process 3" before "3" lets the real label claim it first.
 */
function relax(query: string): string[] {
  const readings: string[] = [];
  let words = query.split(" ");
  // A trailing "node" is never part of a name that got here: one that really ends in it matched
  // exactly, above. A leading kind word can be — "Process (3)" — so those come off one at a time.
  while (words.length > 1 && TRAILING.has(words[words.length - 1])) words = words.slice(0, -1);
  if (words.length !== query.split(" ").length) readings.push(words.join(" "));
  while (words.length > 1 && LEADING.has(words[0])) {
    words = words.slice(1);
    readings.push(words.join(" "));
  }
  return readings;
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
  const readings = relax(query);
  for (const reading of readings) {
    const bare = state.graph.nodes.filter(node => normalize(node.label) === reading);
    if (bare.length) return matches(bare.map(node => node.id));
  }
  const relaxed = readings.at(-1) ?? query;
  // Naming a shape by its kind: "delete the decision". Only reached once no label matched, so a
  // shape genuinely labelled "Decision" still wins, and two decisions ask which one rather than
  // picking. relax() cannot be reused here — it strips type words, so "the decision node" would
  // come back as "node" with the type thrown away.
  const type = TYPE_WORDS[query.replace(/^(?:the|a|an) /, "").replace(/ (?:node|shape|box)$/, "")];
  if (type) {
    const typed = state.graph.nodes.filter(node => node.type === type);
    if (typed.length) return matches(typed.map(node => node.id));
  }
  const ranked = state.graph.nodes.map(node => ({ id: node.id, score: similarity(relaxed, normalize(node.label)) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (ranked[0]?.score >= 0.9) {
    const close = ranked.filter(candidate => ranked[0].score - candidate.score < 0.1 - Number.EPSILON);
    return matches(close.map(candidate => candidate.id));
  }
  if (["the node i just added", "the node i just changed", "the node i just edited"].includes(query)) return existing(state.recentNodeId);
  return { kind: "missing" };
}
