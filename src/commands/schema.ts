import type { Snapshot } from "../graph/types";
import { z } from "zod";
import { nodeTypes, placementRelations, walkDirections } from "../graph/types";

// Count code points to match JSON Schema minLength/maxLength, including non-BMP text.
// Whitespace-only labels are a semantic error, not a wire-format transformation.
const text = z.string().refine(value => {
  const length = Array.from(value).length;
  return length >= 1 && length <= 200;
}, "Expected 1 to 200 Unicode code points.");

export const spokenRefSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("id"), value: text }),
  z.strictObject({ kind: z.literal("label"), value: text }),
  z.strictObject({ kind: z.literal("focus") }),
  z.strictObject({ kind: z.literal("recent") }),
]);
export const placementRefSchema = z.strictObject({
  relation: z.enum(placementRelations), reference: spokenRefSchema,
});
export const spokenElementRefSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("node"), node: spokenRefSchema }),
  z.strictObject({ kind: z.literal("edge_id"), id: text }),
  z.strictObject({ kind: z.literal("edge"), source: spokenRefSchema, target: spokenRefSchema, label: text.nullable() }),
]);
const editVariants = [
  z.strictObject({ kind: z.literal("connect_new"), source: spokenRefSchema, type: z.enum(nodeTypes), label: text }),
  z.strictObject({ kind: z.literal("label_edge"), edgeId: text, label: text.nullable() }),
  z.strictObject({ kind: z.literal("add_node"), type: z.enum(nodeTypes), label: text, placement: placementRefSchema.nullable() }),
  z.strictObject({ kind: z.literal("connect"), source: spokenRefSchema, target: spokenRefSchema, label: text.nullable() }),
  z.strictObject({ kind: z.literal("rename"), node: spokenRefSchema, newLabel: text }),
  z.strictObject({ kind: z.literal("move_to"), node: spokenRefSchema, position: z.strictObject({ x: z.number().min(-100000).max(100000), y: z.number().min(-100000).max(100000) }) }),
  z.strictObject({ kind: z.literal("move"), node: spokenRefSchema, placement: placementRefSchema }),
  z.strictObject({ kind: z.literal("delete"), target: spokenElementRefSchema }),
] as const;
export const editCommandSchema = z.discriminatedUnion("kind", editVariants);
export const commandSchema = z.discriminatedUnion("kind", [
  ...editVariants,
  z.strictObject({ kind: z.literal("compound"), commands: z.array(editCommandSchema).min(1).max(10) }),
  z.strictObject({ kind: z.literal("focus"), node: spokenRefSchema }),
  z.strictObject({ kind: z.literal("clear_focus") }),
  z.strictObject({ kind: z.literal("walk"), direction: z.enum(walkDirections), branch: text.nullable() }),
  z.strictObject({ kind: z.literal("playback"), action: z.enum(["start", "stop", "restart", "repeat", "choose"]), choice: text.nullable() }),
  z.strictObject({ kind: z.literal("audit"), action: z.enum(["open", "next", "previous", "repeat", "close"]) }),
  z.strictObject({ kind: z.literal("undo") }),
  z.strictObject({ kind: z.literal("redo") }),
  z.strictObject({ kind: z.literal("validate") }),
  z.strictObject({ kind: z.literal("confirm") }),
  z.strictObject({ kind: z.literal("cancel") }),
  z.strictObject({ kind: z.literal("describe"), scope: z.enum(["chart", "focus"]) }),
  z.strictObject({ kind: z.literal("inspect"), node: spokenRefSchema.nullable() }),
  z.strictObject({ kind: z.literal("trace_path"), start: spokenRefSchema, end: spokenRefSchema.nullable() }),
]);
export const commandEnvelopeSchema = z.strictObject({ command: commandSchema });

export type SpokenRef = z.infer<typeof spokenRefSchema>;
export type PlacementRef = z.infer<typeof placementRefSchema>;
export type SpokenElementRef = z.infer<typeof spokenElementRefSchema>;
export type EditCommand = z.infer<typeof editCommandSchema>;
export type GraphCommand = z.infer<typeof commandSchema>;
// A Record over the union fails to compile until a newly added edit variant is listed here,
// so the executor's edit gate cannot silently omit a command the transaction already handles.
const editKindMap: Record<EditCommand["kind"], true> = {
  connect_new: true,
  label_edge: true, add_node: true, connect: true, rename: true, move_to: true, move: true, delete: true,
};
export const editKinds: readonly string[] = Object.keys(editKindMap);
export type PendingClarification = {
  kind: "clarification"; command: GraphCommand; referencePath: string;
  candidates: string[]; graphVersion: number;
  elementKind: "node" | "edge";
  allocatedIds: string[];
  context: Pick<Snapshot, "focusedNodeId" | "recentNodeId">;
};
export type PendingDeletion = {
  kind: "deletion"; command: GraphCommand; nodeIds: string[];
  incidentEdgeIds: string[]; graphVersion: number;
  prepared: Snapshot;
};
