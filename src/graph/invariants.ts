import { z } from "zod";
import { nodeTypes, placementRelations, type FlowGraph } from "./types";

const text = z.string().refine(value => value.trim().length > 0 && Array.from(value).length <= 200,
  "Expected nonblank text of at most 200 Unicode code points.");
const graphSchema = z.strictObject({
  schemaVersion: z.literal(1),
  nodes: z.array(z.strictObject({
    id: text,
    type: z.enum(nodeTypes),
    label: text,
    position: z.strictObject({ x: z.number().min(-100000).max(100000), y: z.number().min(-100000).max(100000) }).optional(),
    placement: z.strictObject({ relation: z.enum(placementRelations), referenceNodeId: text }).optional(),
  })),
  edges: z.array(z.strictObject({ id: text, source: text, target: text, label: text.optional() })),
});

export function createEmptyGraph(): FlowGraph {
  return { schemaVersion: 1, nodes: [], edges: [] };
}

/** Validate structure and referential integrity without changing the caller's graph. */
export function assertGraph(graph: unknown): asserts graph is FlowGraph {
  const parsed = graphSchema.parse(graph);
  const nodeIds = new Set<string>();
  for (const node of parsed.nodes) {
    if (nodeIds.has(node.id)) throw new Error(`Duplicate node ID: ${node.id}`);
    nodeIds.add(node.id);
  }
  for (const node of parsed.nodes) {
    if (!node.placement) continue;
    const reference = node.placement.referenceNodeId;
    if (!nodeIds.has(reference)) throw new Error(`Placement references a missing node: ${reference}`);
    if (reference === node.id) throw new Error(`A node cannot be placed relative to itself: ${node.id}`);
  }
  const edgeIds = new Set<string>();
  for (const edge of parsed.edges) {
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate edge ID: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source)) throw new Error(`Edge source is missing: ${edge.source}`);
    if (!nodeIds.has(edge.target)) throw new Error(`Edge target is missing: ${edge.target}`);
    if (edge.source === edge.target) throw new Error(`Self-edges are not supported: ${edge.id}`);
  }
}
