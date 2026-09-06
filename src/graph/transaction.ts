import { layoutGraph } from "../visual/layout";
import type { EngineState, Snapshot } from "./types";
import { assertSnapshot, snapshot } from "./history";
import { resolveNode } from "../commands/resolve";
import { editKinds } from "../commands/schema";
import type { EditCommand, GraphCommand, PendingClarification, SpokenRef } from "../commands/schema";

export class ClarificationRequired extends Error {
  constructor(public readonly pending: PendingClarification, message: string) { super(message); }
}

/** Paths are generated internally from validated command fields, never supplied by a caller. */
export function replaceReference(command: GraphCommand, path: string, replacement: unknown): void {
  const keys = path.split("/").slice(1);
  let object: unknown = command;
  for (const key of keys.slice(0, -1)) {
    if (!object || typeof object !== "object" || !Object.hasOwn(object, key)) throw new Error("Invalid clarification path.");
    object = (object as Record<string, unknown>)[key];
  }
  const last = keys.at(-1);
  if (!last || !object || typeof object !== "object" || !Object.hasOwn(object, last)) throw new Error("Invalid clarification path.");
  (object as Record<string, unknown>)[last] = replacement;
}

export interface PreparedTransaction {
  prepared: Snapshot;
  command: GraphCommand;
  nodeIds: string[];
  incidentEdgeIds: string[];
  message: string;
}

export function prepareTransaction(
  state: EngineState, input: GraphCommand, newId: () => string,
  replayIds: string[] = [], context = { focusedNodeId: state.focusedNodeId, recentNodeId: state.recentNodeId },
): PreparedTransaction {
  const working = { ...snapshot(state), ...context };
  const command = structuredClone(input);
  const allocatedIds = [...replayIds]; let allocationIndex = 0;
  const usedIds = new Set([...state.graph.nodes, ...state.graph.edges].map(item => item.id));
  const nodeIds = new Set<string>(), incidentEdgeIds = new Set<string>();
  let message = "Change applied.";
  const allocate = () => {
    const id = allocatedIds[allocationIndex] ?? newId();
    if (usedIds.has(id)) throw new Error("Generated ID already exists. Retry the command.");
    usedIds.add(id); allocatedIds[allocationIndex++] = id; return id;
  };
  const clarify = (candidates: string[], path: string, elementKind: "node" | "edge"): never => {
    const choices = candidates.slice(0, 3).map(id => {
      if (elementKind === "node") return `${working.graph.nodes.find(node => node.id === id)?.label} (${id})`;
      const edge = working.graph.edges.find(item => item.id === id);
      return `${edge?.label ?? "Unlabeled connection"} (${id})`;
    });
    throw new ClarificationRequired({ kind: "clarification", command, referencePath: path, candidates,
      graphVersion: state.version, elementKind, allocatedIds, context }, `Clarification needed: choose ${choices.join(", ")}.${candidates.length > 3 ? " More matches exist; specify an exact ID." : ""}`);
  };
  const node = (ref: SpokenRef, path: string): string => {
    const result = resolveNode(working, ref);
    if (result.kind === "missing") throw new Error(`Node not found: ${"value" in ref ? ref.value : ref.kind}. Specify an existing node label or ID.`);
    if (result.kind === "ambiguous") return clarify(result.ids, path, "node");
    replaceReference(command, path, { kind: "id", value: result.id });
    return result.id;
  };
  const affect = (id: string) => { working.focusedNodeId = id; working.recentNodeId = id; };
  const apply = (edit: EditCommand, prefix: string) => {
    switch (edit.kind) {
      case "add_node": {
        // Adding a shape must not rearrange existing shapes, including auto-laid-out ones.
        const existing = layoutGraph(working.graph);
        for (const item of working.graph.nodes) {
          const box = existing.nodes.find(box => box.id === item.id)!;
          item.position = { x: box.x, y: box.y };
          delete item.placement;
        }
        const placement = edit.placement ? { relation: edit.placement.relation, referenceNodeId: node(edit.placement.reference, `${prefix}/placement/reference`) } : undefined;
        const id = allocate();
        working.graph.nodes.push({ id, type: edit.type, label: edit.label, ...(placement ? { placement } : {}) });
        affect(id); message = `Added ${edit.type} ${edit.label}.`; break;
      }
      case "connect": {
        const source = node(edit.source, `${prefix}/source`), target = node(edit.target, `${prefix}/target`);
        working.graph.edges.push({ id: allocate(), source, target, ...(edit.label === null ? {} : { label: edit.label }) });
        affect(target); message = "Connected nodes."; break;
      }
      case "label_edge": {
        const edge = working.graph.edges.find(item => item.id === edit.edgeId);
        if (!edge) throw new Error("Connection not found. Select an existing arrow.");
        if (edit.label === null) delete edge.label; else edge.label = edit.label;
        message = edit.label === null ? "Cleared connection label." : `Labeled connection ${edit.label}.`;
        break;
      }
      case "rename": {
        const id = node(edit.node, `${prefix}/node`);
        working.graph.nodes.find(item => item.id === id)!.label = edit.newLabel;
        affect(id); message = `Renamed node to ${edit.newLabel}.`; break;
      }
      case "move_to": {
        const id = node(edit.node, `${prefix}/node`);
        // Freeze the current arrangement so moving one shape cannot pull its neighbors along.
        const layout = layoutGraph(working.graph);
        for (const item of working.graph.nodes) {
          const box = layout.nodes.find(box => box.id === item.id)!;
          item.position = { x: box.x, y: box.y };
          delete item.placement;
        }
        working.graph.nodes.find(item => item.id === id)!.position = { ...edit.position };
        affect(id); message = "Moved node."; break;
      }
      case "move": {
        const id = node(edit.node, `${prefix}/node`);
        delete working.graph.nodes.find(item => item.id === id)!.position;
        const referenceNodeId = node(edit.placement.reference, `${prefix}/placement/reference`);
        working.graph.nodes.find(item => item.id === id)!.placement = { relation: edit.placement.relation, referenceNodeId };
        affect(id); message = "Moved node."; break;
      }
      case "delete": {
        if (edit.target.kind === "node") {
          const id = node(edit.target.node, `${prefix}/target/node`);
          const incident = working.graph.edges.filter(edge => edge.source === id || edge.target === id);
          if (incident.length) { nodeIds.add(id); incident.forEach(edge => incidentEdgeIds.add(edge.id)); }
          working.graph.nodes = working.graph.nodes.filter(item => item.id !== id);
          working.graph.edges = working.graph.edges.filter(edge => edge.source !== id && edge.target !== id);
          working.graph.nodes.forEach(item => { if (item.placement?.referenceNodeId === id) delete item.placement; });
          if (working.focusedNodeId === id) working.focusedNodeId = null;
          working.recentNodeId = null; message = "Deleted node.";
        } else {
          let id: string;
          if (edit.target.kind === "edge_id") id = edit.target.id;
          else {
            const source = node(edit.target.source, `${prefix}/target/source`), target = node(edit.target.target, `${prefix}/target/target`);
            const edgeLabel = edit.target.label;
            const candidates = working.graph.edges.filter(edge => edge.source === source && edge.target === target && (edgeLabel === null || edge.label === edgeLabel)).map(edge => edge.id).sort();
            if (!candidates.length) throw new Error("Connection not found. Specify an existing edge ID.");
            if (candidates.length > 1) return clarify(candidates, `${prefix}/target`, "edge");
            id = candidates[0];
            replaceReference(command, `${prefix}/target`, { kind: "edge_id", id });
          }
          if (!working.graph.edges.some(edge => edge.id === id)) throw new Error("Connection not found. Specify an existing edge ID.");
          working.graph.edges = working.graph.edges.filter(edge => edge.id !== id);
          working.recentNodeId = null; message = "Deleted connection.";
        }
        break;
      }
    }
    // Invalid intermediate edits must not be hidden by a later edit in a compound.
    assertSnapshot(working);
  };
  if (command.kind === "focus") {
    working.focusedNodeId = node(command.node, "/node"); message = `Focused ${working.graph.nodes.find(item => item.id === working.focusedNodeId)!.label}.`;
  } else if (command.kind === "compound") {
    command.commands.forEach((edit, index) => apply(edit, `/commands/${index}`)); message = `Applied ${command.commands.length} edits.`;
  } else if (editKinds.includes(command.kind)) apply(command as EditCommand, "");
  else throw new Error("This command does not edit or focus the graph.");
  assertSnapshot(working);
  return { prepared: working, command, nodeIds: [...nodeIds], incidentEdgeIds: [...incidentEdgeIds], message };
}
