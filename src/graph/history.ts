import { assertGraph } from "./invariants";
import type { EngineState, Snapshot } from "./types";

export function snapshot(state: Snapshot): Snapshot {
  return structuredClone({ graph: state.graph, focusedNodeId: state.focusedNodeId, recentNodeId: state.recentNodeId });
}
export function assertSnapshot(value: Snapshot): void {
  assertGraph(value.graph);
  for (const id of [value.focusedNodeId, value.recentNodeId]) {
    if (id !== null && !value.graph.nodes.some(node => node.id === id)) throw new Error("Focus or recent reference no longer exists.");
  }
}
export function commit(state: EngineState, prepared: Snapshot): EngineState {
  assertSnapshot(prepared);
  return {
    ...snapshot(prepared), version: state.version + 1, pending: null,
    history: { past: [...structuredClone(state.history.past), snapshot(state)], future: [] },
  };
}
export function restoreHistory(state: EngineState, direction: "undo" | "redo"): EngineState {
  const source = direction === "undo" ? state.history.past : state.history.future;
  const target = source.at(-1);
  if (!target) throw new Error(`Nothing to ${direction}.`);
  assertSnapshot(target);
  const history = structuredClone(state.history);
  if (direction === "undo") { history.past.pop(); history.future.push(snapshot(state)); }
  else { history.future.pop(); history.past.push(snapshot(state)); }
  return { ...snapshot(target), version: state.version + 1, history, pending: null };
}
