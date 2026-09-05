export const nodeTypes = ["start", "process", "decision", "end"] as const;
export const placementRelations = ["before", "after", "above", "below", "left_of", "right_of"] as const;
export type NodeId = string;
export type EdgeId = string;
export type NodeType = (typeof nodeTypes)[number];
export type PlacementRelation = (typeof placementRelations)[number];

export interface FlowNode {
  id: NodeId;
  type: NodeType;
  label: string;
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
