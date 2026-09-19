import { largeGraph } from "../test/large-graph";
import { arrangeNodes, createEngineState, execute, executeNodeSelectionDeletion, resolveClarification } from "../commands/execute";
import { assertGraph } from "../graph/invariants";
import { commit } from "../graph/history";
import type { NodeDensity } from "../visual/layout";
import type { GraphCommand } from "../commands/schema";
import type { CommandResult, EngineState, FlowGraph } from "../graph/types";
export type EditorState = { displayIds: Record<string, string>; engine: EngineState; outcome: CommandResult["outcome"] | "idle"; message: string };
export type EditorAction = { type: "example" } | { type: "clear" } | { type: "arrange"; density: NodeDensity } | { type: "command"; command: GraphCommand; idSeed: string } | { type: "delete_selection"; nodeIds: string[]; idSeed: string } | { type: "choose"; candidateId: string; idSeed: string } | { type: "interface_focus"; focusedNodeId: string | null; message: string } | { type: "import_project"; graph: FlowGraph; filename: string };
export function createEditorState(): EditorState { return { displayIds: {}, engine: createEngineState(), outcome: "idle", message: "Add a node to begin your chart." }; }
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === "import_project") {
    try {
      assertGraph(action.graph);
      const graph = structuredClone(action.graph);
      const focus = graph.nodes.find(node => node.type === "start") ?? graph.nodes[0] ?? null;
      const engine = commit(state.engine, {
        graph,
        focusedNodeId: focus?.id ?? null,
        recentNodeId: focus?.id ?? null,
      });
      const displayIds = { ...state.displayIds };
      for (const node of graph.nodes) if (!displayIds[node.id]) displayIds[node.id] = `N${Object.keys(displayIds).length + 1}`;
      const filename = action.filename.split(/[\\/]/).at(-1)?.trim() || "project.koi";
      const nodeCount = graph.nodes.length;
      const edgeCount = graph.edges.length;
      const message = nodeCount === 0 && edgeCount === 0
        ? `Loaded an empty chart from ${filename}. Undo restores your previous chart.`
        : `Loaded ${nodeCount} ${nodeCount === 1 ? "shape" : "shapes"} and ${edgeCount} ${edgeCount === 1 ? "connection" : "connections"} from ${filename}. Undo restores your previous chart.`;
      return { displayIds, engine, outcome: "committed", message };
    } catch {
      return { ...state, outcome: "error", message: "This Koi project contains an invalid chart and was not loaded." };
    }
  }
  if (action.type === "clear") {
    if (!state.engine.graph.nodes.length) return state;
    const { graph: previousGraph, focusedNodeId, recentNodeId } = state.engine;
    return {
      displayIds: {},
      engine: {
        ...createEngineState(),
        version: state.engine.version + 1,
        history: {
          past: [...state.engine.history.past, { graph: previousGraph, focusedNodeId, recentNodeId }],
          future: []
        }
      },
      outcome: "committed",
      message: "Chart cleared. Undo restores your nodes."
    };
  }
  if (action.type === "example") {
    if (state.engine.graph.nodes.length || state.engine.pending) return state;
    const graph = largeGraph();
    const { graph: previousGraph, focusedNodeId, recentNodeId } = state.engine;
    const ids = { ...state.displayIds };
    for (const node of graph.nodes) if (!ids[node.id]) ids[node.id] = `N${Object.keys(ids).length + 1}`;
    return { displayIds: ids, engine: { ...state.engine, graph, focusedNodeId: graph.nodes[15].id, recentNodeId: graph.nodes.at(-1)!.id, version: state.engine.version + 1, history: { past: [...state.engine.history.past, {graph:previousGraph,focusedNodeId,recentNodeId}], future: [] } }, outcome: "committed", message: "Loaded a 32-node example. Undo restores the empty chart." };
  }
  if (action.type === "interface_focus") {
    return { ...state, engine: { ...state.engine, focusedNodeId: action.focusedNodeId }, outcome: "focused", message: action.message };
  }
  let result: CommandResult;
  if (action.type === "arrange") result = arrangeNodes(state.engine, action.density);
  else {
    // The event supplies a seed so React's repeated reducer calls produce the same IDs.
    let index = 0; const newId = () => `${action.idSeed}-${++index}`;
    result = action.type === "command"
      ? execute(state.engine, action.command, newId)
      : action.type === "delete_selection"
        ? executeNodeSelectionDeletion(state.engine, action.nodeIds, newId)
        : resolveClarification(state.engine, action.candidateId, newId);
  }
  const displayIds = { ...state.displayIds };
  for (const node of result.state.graph.nodes) if (!displayIds[node.id]) displayIds[node.id] = `N${Object.keys(displayIds).length + 1}`;
  return { displayIds, engine: result.state, outcome: result.outcome, message: result.outcome === "error" && result.message.startsWith("[") ? "Check your input. Labels must contain 1 to 200 characters, and node selections must be valid." : result.message };
}
