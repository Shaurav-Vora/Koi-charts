import { largeGraph } from "../test/large-graph";
import { createEngineState, execute, resolveClarification } from "../commands/execute";
import type { GraphCommand } from "../commands/schema";
import type { CommandResult, EngineState } from "../graph/types";
export type EditorState = { displayIds: Record<string, string>; engine: EngineState; outcome: CommandResult["outcome"] | "idle"; message: string };
export type EditorAction = { type: "example" } | { type: "command"; command: GraphCommand; idSeed: string } | { type: "choose"; candidateId: string; idSeed: string };
export function createEditorState(): EditorState { return { displayIds: {}, engine: createEngineState(), outcome: "idle", message: "Add a node to begin your chart." }; }
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "example") {
    if (state.engine.graph.nodes.length || state.engine.pending) return state;
    const graph = largeGraph();
    const { graph: previousGraph, focusedNodeId, recentNodeId } = state.engine;
    const ids = { ...state.displayIds };
    for (const node of graph.nodes) if (!ids[node.id]) ids[node.id] = `N${Object.keys(ids).length + 1}`;
    return { displayIds: ids, engine: { ...state.engine, graph, focusedNodeId: graph.nodes[15].id, recentNodeId: graph.nodes.at(-1)!.id, version: state.engine.version + 1, history: { past: [...state.engine.history.past, {graph:previousGraph,focusedNodeId,recentNodeId}], future: [] } }, outcome: "committed", message: "Loaded a 32-node example. Undo restores the empty chart." };
  }
  // The event supplies a seed so React's repeated reducer calls produce the same IDs.
  let index = 0; const newId = () => `${action.idSeed}-${++index}`;
  const result = action.type === "command" ? execute(state.engine, action.command, newId) : resolveClarification(state.engine, action.candidateId, newId);
  const displayIds = { ...state.displayIds };
  for (const node of result.state.graph.nodes) if (!displayIds[node.id]) displayIds[node.id] = `N${Object.keys(displayIds).length + 1}`;
  return { displayIds, engine: result.state, outcome: result.outcome, message: result.outcome === "error" && result.message.startsWith("[") ? "Check your input. Labels must contain 1 to 200 characters, and node selections must be valid." : result.message };
}
