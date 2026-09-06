export const nodeTypes = ["start", "process", "decision", "end"] as const;
export const placementRelations = ["before", "after", "above", "below", "left_of", "right_of"] as const;
// Cursor movement, spoken: step along a connection, stand still and listen, or jump to either end.
export const walkDirections = ["next", "back", "first", "last", "stay"] as const;
export type NodeId = string;
export type EdgeId = string;
export type NodeType = (typeof nodeTypes)[number];
export type PlacementRelation = (typeof placementRelations)[number];

export interface FlowNode {
  id: NodeId;
  type: NodeType;
  label: string;
  position?: { x: number; y: number };
  placement?: { relation: PlacementRelation; referenceNodeId: NodeId };
}

export interface FlowEdge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;
}

export interface FlowGraph {
  schemaVersion: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}
import type { PendingClarification, PendingDeletion } from "../commands/schema";

export interface Snapshot {
  graph: FlowGraph;
  focusedNodeId: NodeId | null;
  recentNodeId: NodeId | null;
}
export interface History { past: Snapshot[]; future: Snapshot[] }
export interface EngineState extends Snapshot {
  version: number;
  history: History;
  pending: PendingClarification | PendingDeletion | null;
}
export interface CommandResult {
  state: EngineState;
  outcome: "committed" | "focused" | "explored" | "clarification" | "confirmation" | "cancelled" | "error";
  message: string;
}
