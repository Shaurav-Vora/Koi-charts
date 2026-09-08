import type { GraphCommand, SpokenRef } from "./schema";
import type { placementRelations } from "../graph/types";
import { TYPE_WORDS, type NodeType } from "../graph/type-words";
import { collapse, stripFillers } from "./phrasing";

/**
 * Explicit templates for the phrases an author says most often. A template only ever produces a
 * command it is certain of: anything it cannot read exactly returns null and reaches the model
 * instead. A missed match costs one interpretation; a confident wrong match writes the wrong
 * thing into the chart, so every rule below is written to refuse rather than to guess.
 *
 * The phrases these rules accept are documented in grammar.ts, and a contract test holds the
 * two together: a form that appears in the guide but no longer parses fails the build.
 */

type Relation = typeof placementRelations[number];
const RELATION_WORDS: Record<string, Relation> = {
  before: "before", after: "after",
  above: "above", over: "above", below: "below", under: "below", underneath: "below",
  "left of": "left_of", "to the left of": "left_of",
  "right of": "right_of", "to the right of": "right_of",
};
const DEFAULT_LABELS: Record<NodeType, string> = { start: "Start", process: "Process", decision: "Decision", end: "End" };
const alternation = (words: Record<string, unknown>) => Object.keys(words).sort((a, b) => b.length - a.length).join("|");
const TYPES = alternation(TYPE_WORDS);
// Longest first, so "to the right of" is never read as the word "right" followed by a shape.
const RELATIONS = alternation(RELATION_WORDS);
const VERB = "add|create|insert|make|place|put|new";
const NAMING = "called|named|labell?ed|titled|that says|saying";
// "step" is deliberately absent: it names a shape type here, not the word "node".
const SHAPE = "node|shape|box";

const norm = collapse;
/**
 * A second command hiding inside a label is the dangerous case: "Review and approve" is a real
 * step, while "Review and connect it to End" is two requests. Neither may be split here, so an
 * utterance that looks like a chain is handed to the model whole.
 */
const CHAINED = /\bthen\b|\b(?:and|,)\s+(?:also\s+)?(?:connect|link|join|delete|remove|erase|rename|relabel|add|create|insert|make|focus|select|move|undo|redo|draw)\b/i;
/** A shape described rather than named does not exist yet, so no local rule can resolve it. */
const VAGUE = /^(?:a|an|the)\s+(?:new\s+|another\s+)?(?:start|process|decision|end|choice|step|task|action|question|finish|stop|node|shape|box)\b/i;
/** Anything addressed in bulk is a sequence the model must expand, not one named shape. */
const BULK = /^(?:all|every|each|everything|both)\b/i;
const PRONOUN = /^(?:this|that|it|(?:the\s+)?(?:selected|focused|current)(?:\s+(?:node|shape|box|one))?|(?:the\s+)?selection)$/i;
const RECENT = /^(?:the\s+)?(?:last|previous|latest|most recent)(?:\s+(?:node|shape|box|one))?$/i;

/**
 * Quotes are how an author protects wording that would otherwise be read as command grammar,
 * so a quoted label is taken exactly, punctuation and all. Everywhere else the terminal stop
 * belongs to the dictation rather than the label: AssemblyAI's finals always carry one.
 */
function cleanLabel(raw: string, keepQuestion = false): string | null {
  const trimmed = norm(raw);
  const quoted = /^"([^"]+)"[.!?]*$/.exec(trimmed);
  const value = quoted ? quoted[1].trim() : trimmed.replace(keepQuestion ? /[.!]+$/ : /[.!?]+$/, "").trim();
  if (!value || value.includes('"') || CHAINED.test(value)) return null;
  const length = Array.from(value).length;
  return length >= 1 && length <= 200 ? value : null;
}

function ref(raw: string): SpokenRef | null {
  const value = cleanLabel(raw);
  if (!value) return null;
  if (PRONOUN.test(value)) return { kind: "focus" };
  if (RECENT.test(value)) return { kind: "recent" };
  return VAGUE.test(value) || BULK.test(value) ? null : { kind: "label", value };
}

/** Splits on the first " to ", which a quoted name is used to escape: `rename "Go to shop" to X`. */
function pair(rest: string): [string, string] | null {
  const quoted = /^"([^"]+)"\s+to\s+(.+)$/i.exec(rest);
  if (quoted) return [`"${quoted[1]}"`, quoted[2]];
  const plain = /^(.+?)\s+to\s+(.+)$/i.exec(rest);
  return plain ? [plain[1], plain[2]] : null;
}

/** A placement is only ever accepted whole: a relation with no shape beside it is not one. */
function placement(relation: string | undefined, reference: string | undefined) {
  if (!relation) return { ok: true, value: null } as const;
  const target = reference === undefined ? null : ref(reference);
  return target ? { ok: true, value: { relation: RELATION_WORDS[relation.toLowerCase()], reference: target } } as const : { ok: false } as const;
}

function addNode(type: string, rawLabel: string | undefined, relation?: string, reference?: string): GraphCommand | null {
  const shape = TYPE_WORDS[type.toLowerCase()];
  const place = placement(relation, reference);
  if (!place.ok) return null;
  // A decision is usually phrased as a question, so its mark is part of the label it names.
  const label = rawLabel === undefined ? DEFAULT_LABELS[shape] : cleanLabel(rawLabel, shape === "decision");
  return label ? { kind: "add_node", type: shape, label, placement: place.value } : null;
}

const patterns: { pattern: RegExp; build: (match: RegExpExecArray) => GraphCommand | null }[] = [
  { // add, named in quotes: the quotes protect a label that contains command grammar
    pattern: new RegExp(`^(?:${VERB}) (?:a |an |the )?(${TYPES})(?: (?:${SHAPE}))? (?:${NAMING}) "([^"]+)"(?: (${RELATIONS}) (.+?))?[.!?]*$`, "i"),
    build: match => addNode(match[1], `"${match[2]}"`, match[3], match[4]),
  },
  { // add, named
    pattern: new RegExp(`^(?:${VERB}) (?:a |an |the )?(${TYPES})(?: (?:${SHAPE}))? (?:${NAMING}) (.+?)(?: (${RELATIONS}) (.+))?$`, "i"),
    build: match => addNode(match[1], match[2], match[3], match[4]),
  },
  { // add, unnamed, placed beside an existing shape
    pattern: new RegExp(`^(?:${VERB}) (?:a |an |the )?(${TYPES})(?: (?:${SHAPE}))? (${RELATIONS}) (.+)$`, "i"),
    build: match => addNode(match[1], undefined, match[2], match[3]),
  },
  { // add, unnamed
    pattern: new RegExp(`^(?:${VERB}) (?:a |an |the )?(${TYPES})(?: (?:${SHAPE}))?[.!?]*$`, "i"),
    build: match => addNode(match[1], undefined),
  },
  { // move an existing shape beside another
    pattern: new RegExp(`^(?:move|put|place) (?:the )?(.+?) (${RELATIONS}) (.+)$`, "i"),
    build: match => {
      const node = ref(match[1]), place = placement(match[2], match[3]);
      return node && place.ok && place.value ? { kind: "move", node, placement: place.value } : null;
    },
  },
  { // rename
    pattern: /^(?:rename|relabel) (.+)$/i,
    build: match => {
      const parts = pair(match[1]);
      if (!parts) return null;
      const node = ref(parts[0]), newLabel = cleanLabel(parts[1]);
      return node && newLabel ? { kind: "rename", node, newLabel } : null;
    },
  },
  { // delete a connection, named by its two ends
    pattern: /^(?:delete|remove|erase) (?:the )?(?:connection|arrow|link|edge) (?:from )?(.+)$/i,
    build: match => {
      const parts = pair(match[1]);
      if (!parts) return null;
      const source = ref(parts[0]), target = ref(parts[1]);
      return source && target ? { kind: "delete", target: { kind: "edge", source, target, label: null } } : null;
    },
  },
  { // delete a shape. The engine still refuses to drop a connected shape without confirmation.
    pattern: new RegExp(`^(?:delete|remove|erase) (?:the )?(?:(?:${SHAPE}) )?(.+)$`, "i"),
    build: match => { const node = ref(match[1]); return node ? { kind: "delete", target: { kind: "node", node } } : null; },
  },
  { // connect
    pattern: /^(?:(?:connect|link|join)|draw (?:an? )?(?:arrow|line|connection|edge)) (?:from )?(.+)$/i,
    build: match => {
      const parts = pair(match[1]);
      if (!parts) return null;
      const named = new RegExp(`^(.+?) (?:${NAMING}|with label) (.+)$`, "i").exec(parts[1]);
      const source = ref(parts[0]), target = ref(named ? named[1] : parts[1]);
      const label = named ? cleanLabel(named[2]) : null;
      if (!source || !target || (named && !label)) return null;
      return { kind: "connect", source, target, label };
    },
  },
  { // trace a route between two shapes, or from one shape onward
    pattern: /^trace (?:the )?(?:path|route) from (.+)$/i,
    build: match => {
      const parts = pair(match[1]);
      const start = ref(parts ? parts[0] : match[1]);
      if (!start) return null;
      if (!parts) return { kind: "trace_path", start, end: null };
      const end = ref(parts[1]);
      return end ? { kind: "trace_path", start, end } : null;
    },
  },
  { // inspect a named shape. "inspect focus" is a control phrase and never reaches here.
    pattern: new RegExp(`^inspect (?:the )?(?:(?:${SHAPE}) )?(.+)$`, "i"),
    build: match => { const node = ref(match[1]); return node ? { kind: "inspect", node } : null; },
  },
  { // focus
    pattern: new RegExp(`^(?:focus on|focus|select|highlight) (?:the )?(?:(?:${SHAPE}) )?(.+)$`, "i"),
    build: match => { const node = ref(match[1]); return node ? { kind: "focus", node } : null; },
  },
];

export function parseTemplate(text: string): GraphCommand | null {
  const clean = stripFillers(text);
  for (const { pattern, build } of patterns) {
    const match = pattern.exec(clean);
    if (match) return build(match);
  }
  return null;
}
