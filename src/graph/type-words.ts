import type { nodeTypes } from "./types";

export type NodeType = typeof nodeTypes[number];

/**
 * The words authors use for each kind of shape. Shared by the command templates, which read them
 * when a shape is created, and by reference resolution, which reads them when a shape is named
 * by its kind — "delete the decision" is how someone refers to the only decision on the chart.
 */
export const TYPE_WORDS: Record<string, NodeType> = {
  start: "start", begin: "start", beginning: "start",
  process: "process", step: "process", action: "process", task: "process",
  decision: "decision", choice: "decision", question: "decision",
  end: "end", finish: "end", stop: "end", terminal: "end",
};
