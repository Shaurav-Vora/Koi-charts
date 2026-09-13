import { exploreCommand } from "./explore";
import { walkCommand } from "./walk";
import { createEmptyGraph } from "../graph/invariants";
import { assertSnapshot, commit, restoreHistory } from "../graph/history";
import type { CommandResult, EngineState, Snapshot } from "../graph/types";
import { ClarificationRequired, prepareTransaction, replaceReference } from "../graph/transaction";
import { commandSchema, type GraphCommand } from "./schema";

export function createEngineState(): EngineState {
  return { graph: createEmptyGraph(), focusedNodeId: null, recentNodeId: null, version: 0,
    history: { past: [], future: [] }, pending: null };
}
/**
 * The question the author answers by voice. It names the shapes rather than counting them, and
 * stays short: the microphone is muted while a reply plays, so a long question swallows the
 * "confirm" said over it and looks to the author like deletion simply not working.
 */
function confirmationQuestion(state: EngineState, nodeIds: string[], connections: number): string {
  const names = nodeIds.map(id => state.graph.nodes.find(node => node.id === id)?.label).filter(Boolean);
  const subject = names.length === 1 ? names[0] : `${names.length} shapes`;
  return `Delete ${subject} and ${connections} ${connections === 1 ? "connection" : "connections"}? Say confirm or cancel.`;
}
function failure(state: EngineState, message: string): CommandResult { return { state, outcome: "error", message }; }
function run(state: EngineState, command: GraphCommand, newId: () => string,
  allocatedIds?: string[], context?: Pick<Snapshot, "focusedNodeId" | "recentNodeId">): CommandResult {
  try {
    assertSnapshot(state);
    const exploration = exploreCommand(state, command, context);
    if (exploration) return exploration;
    const result = prepareTransaction(state, command, newId, allocatedIds, context);
    if (command.kind === "focus") return { state: { ...state, focusedNodeId: result.prepared.focusedNodeId }, outcome: "focused", message: result.message };
    if (result.incidentEdgeIds.length) {
      return { state: { ...state, pending: { kind: "deletion", command: result.command, nodeIds: result.nodeIds,
        incidentEdgeIds: result.incidentEdgeIds, graphVersion: state.version, prepared: result.prepared } },
        outcome: "confirmation", message: confirmationQuestion(state, result.nodeIds, result.incidentEdgeIds.length) };
    }
    return { state: commit(state, result.prepared), outcome: "committed", message: result.message };
  } catch (error) {
    if (error instanceof ClarificationRequired) return { state: { ...state, pending: error.pending }, outcome: "clarification", message: error.message };
    return failure(state, error instanceof Error ? error.message : "Command failed. Check the references and try again.");
  }
}

export function execute(state: EngineState, input: unknown, newId: () => string): CommandResult {
  const parsed = commandSchema.safeParse(input);
  if (!parsed.success) return failure(state, "Command could not be understood. Check its fields and try again.");
  const command = parsed.data;
  try {
    if (command.kind === "clear_focus") return { state: { ...state, focusedNodeId: null }, outcome: "focused", message: "Selection cleared." };
    if (command.kind === "cancel") return { state: { ...state, pending: null }, outcome: "cancelled", message: "Cancelled." };
    if (command.kind === "confirm") {
      if (state.pending?.kind !== "deletion") return failure(state, "No deletion to confirm.");
      if (state.pending.graphVersion !== state.version) return failure({ ...state, pending: null }, "The chart changed. Repeat the deletion command.");
      assertSnapshot(state);
      commandSchema.parse(state.pending.command);
      return { state: commit(state, state.pending.prepared), outcome: "committed", message: "Deletion confirmed. Change applied." };
    }
    if (command.kind === "undo" || command.kind === "redo") {
      return { state: restoreHistory(state, command.kind), outcome: "committed", message: command.kind === "undo" ? "Undid last edit." : "Redid last edit." };
    }
    if (command.kind === "playback") return failure(state, "Start Test chart mode first.");
    if (command.kind === "audit") return failure(state, "Use Check chart to open the chart review.");
    const walked = walkCommand(state, command);
    if (walked) return walked;
    return run(state, command, newId);
  } catch (error) {
    return failure(state, error instanceof Error ? error.message : "Command failed. Try again.");
  }
}

/** Candidate selection resumes a stored command; it is not an independent graph edit. */
export function resolveClarification(state: EngineState, candidateId: string, newId: () => string): CommandResult {
  const pending = state.pending;
  if (pending?.kind !== "clarification") return failure(state, "No clarification is pending.");
  if (pending.graphVersion !== state.version) return failure({ ...state, pending: null }, "The chart changed. Repeat the original command.");
  if (!pending.candidates.includes(candidateId)) return failure(state, "Choose one of the matching IDs.");
  try {
    const command = structuredClone(pending.command);
    replaceReference(command, pending.referencePath, pending.elementKind === "node" ? { kind: "id", value: candidateId } : { kind: "edge_id", id: candidateId });
    const result = run(state, commandSchema.parse(command), newId, pending.allocatedIds, pending.context);
    if (result.outcome === "focused" || result.outcome === "explored") result.state = { ...result.state, pending: null };
    return result;
  } catch (error) {
    return failure(state, error instanceof Error ? error.message : "Could not resolve the selection. Repeat the command.");
  }
}
