import type { EditorState } from "./reducer";

/** Shorten routine focus feedback only; preserve questions, errors and explicit descriptions. */
export function briefReply(state: EditorState, message: string): string {
 // A separate presentation may contain a network error or clarification, not this result.
 if (message !== state.message || state.outcome !== "focused") return message;
 const node = state.engine.graph.nodes.find(item => item.id === state.engine.focusedNodeId);
 if (!node) return message;
 // Match known generated prefixes, never split on punctuation inside the author's label.
 if (message === `Focused ${node.label}.` || message.startsWith(`"${node.label}" (${node.type}). `)) return node.label;
 // Preserve warnings such as "The chart has no start node" before a fallback navigation.
 return message;
}
