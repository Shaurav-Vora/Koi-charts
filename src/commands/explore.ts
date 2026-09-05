import { describeChart, describeTrace, inspectNode } from "../feedback/describe";
import { validateGraph } from "../graph/queries";
import { ClarificationRequired, replaceReference } from "../graph/transaction";
import type { CommandResult, EngineState, Snapshot } from "../graph/types";
import { resolveNode } from "./resolve";
import type { GraphCommand, SpokenRef } from "./schema";

/** Exploration returns the original state; only an ambiguous reference creates pending UI state. */
export function exploreCommand(
  state: EngineState, input: GraphCommand,
  context: Pick<Snapshot, "focusedNodeId" | "recentNodeId"> = state,
): CommandResult | null {
  if (!["describe", "inspect", "trace_path", "validate"].includes(input.kind)) return null;
  const command = structuredClone(input);
  const working = { ...state, focusedNodeId: context.focusedNodeId, recentNodeId: context.recentNodeId };
  const focus = () => {
    if (working.focusedNodeId === null) throw new Error("No node is focused. Focus a node by label or ID first.");
    return working.focusedNodeId;
  };
  const resolve = (ref: SpokenRef, path: string): string => {
    if (ref.kind === "focus" && working.focusedNodeId === null) focus();
    const result = resolveNode(working, ref);
    if (result.kind === "missing") throw new Error(`Node not found: ${"value" in ref ? ref.value : ref.kind}. Choose an existing label or ID.`);
    if (result.kind === "ambiguous") {
      const choices = result.ids.slice(0, 3).map(id => `"${state.graph.nodes.find(node => node.id === id)!.label}" (${id})`);
      throw new ClarificationRequired({ kind: "clarification", command, referencePath: path, candidates: result.ids,
        graphVersion: state.version, elementKind: "node", allocatedIds: [],
        context: { focusedNodeId: context.focusedNodeId, recentNodeId: context.recentNodeId } },
        `Clarification needed: choose ${choices.join(", ")}.${result.ids.length > 3 ? " More matches exist; specify an exact ID." : ""}`);
    }
    replaceReference(command, path, { kind: "id", value: result.id });
    return result.id;
  };
  let message: string;
  switch (command.kind) {
    case "describe": message = command.scope === "chart" ? describeChart(state.graph) : inspectNode(state.graph, focus()); break;
    case "inspect": message = inspectNode(state.graph, resolve(command.node ?? { kind: "focus" }, "/node")); break;
    case "trace_path": {
      const startId = resolve(command.start, "/start");
      const endId = command.end === null ? undefined : resolve(command.end, "/end");
      message = describeTrace(state.graph, startId, endId); break;
    }
    case "validate": {
      const warnings = validateGraph(state.graph);
      message = warnings.length ? warnings.join(" ") : "No structural issues found."; break;
    }
    default: return null;
  }
  return { state, outcome: "explored", message };
}
