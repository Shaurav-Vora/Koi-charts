import { createEngineState, execute, resolveClarification } from "../commands/execute";
import type { GraphCommand } from "../commands/schema";
import type { CommandResult, EngineState } from "../graph/types";
export type EditorState = { engine: EngineState; outcome: CommandResult["outcome"] | "idle"; message: string };
export type EditorAction = { type: "command"; command: GraphCommand; idSeed: string } | { type: "choose"; candidateId: string; idSeed: string };
export function createEditorState(): EditorState { return { engine: createEngineState(), outcome: "idle", message: "Add a node to begin your chart." }; }
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  // The event supplies a seed so React's repeated reducer calls produce the same IDs.
  let index = 0; const newId = () => `${action.idSeed}-${++index}`;
  const result = action.type === "command" ? execute(state.engine, action.command, newId) : resolveClarification(state.engine, action.candidateId, newId);
  return { engine: result.state, outcome: result.outcome, message: result.outcome === "error" && result.message.startsWith("[") ? "Check your input. Labels must contain 1 to 200 characters, and node selections must be valid." : result.message };
}
