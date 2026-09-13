// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { GraphCommand } from "../commands/schema";
import { createEditorCoordinator } from "./coordinator";

type Coordinator = ReturnType<typeof createEditorCoordinator>;

const command = (coordinator: Coordinator, idSeed: string, value: GraphCommand) =>
  coordinator.dispatch({ type: "command", idSeed, command: value });

function chartWithReviewIssues(coordinator: Coordinator) {
  command(coordinator, "s", { kind: "add_node", type: "start", label: "Begin", placement: null });
  command(coordinator, "e", { kind: "add_node", type: "end", label: "Finish", placement: null });
  command(coordinator, "p", { kind: "add_node", type: "process", label: "Stopped", placement: null });
  command(coordinator, "d", { kind: "add_node", type: "decision", label: "Approved?", placement: null });
  command(coordinator, "finish", { kind: "connect", source: { kind: "id", value: "s-1" }, target: { kind: "id", value: "e-1" }, label: null });
  command(coordinator, "stopped", { kind: "connect", source: { kind: "id", value: "s-1" }, target: { kind: "id", value: "p-1" }, label: null });
  command(coordinator, "choice", { kind: "connect", source: { kind: "id", value: "s-1" }, target: { kind: "id", value: "d-1" }, label: null });
  command(coordinator, "yes", { kind: "connect", source: { kind: "id", value: "d-1" }, target: { kind: "id", value: "e-1" }, label: null });
}

describe("editor audit integration", () => {
  it("focuses each issue target without changing graph history", () => {
    const coordinator = createEditorCoordinator();
    chartWithReviewIssues(coordinator);
    const before = coordinator.getSnapshot().editor.engine;

    coordinator.auditDispatch({ type: "open", graphVersion: before.version });
    expect(coordinator.getSnapshot().editor.engine.focusedNodeId).toBe("p-1");

    coordinator.auditDispatch({ type: "next", graphVersion: before.version });
    const after = coordinator.getSnapshot();
    expect(after.audit.currentIssueId).toBe("node:d-1:decision-branch-count");
    expect(after.editor.engine.focusedNodeId).toBe("d-1");
    expect(after.editor.engine.version).toBe(before.version);
    expect(after.editor.engine.history).toEqual(before.history);
  });

  it("recalculates an open audit after edits and retains a surviving issue", () => {
    const coordinator = createEditorCoordinator();
    chartWithReviewIssues(coordinator);
    const version = coordinator.getSnapshot().editor.engine.version;
    coordinator.auditDispatch({ type: "open", graphVersion: version });
    coordinator.auditDispatch({ type: "next", graphVersion: version });

    command(coordinator, "rename", { kind: "rename", node: { kind: "id", value: "e-1" }, newLabel: "Done" });

    const after = coordinator.getSnapshot();
    expect(after.audit.currentIssueId).toBe("node:d-1:decision-branch-count");
    expect(after.audit.graphVersion).toBe(after.editor.engine.version);
  });

  it("keeps guided playback and chart audit mutually exclusive", () => {
    const coordinator = createEditorCoordinator();
    command(coordinator, "s", { kind: "add_node", type: "start", label: "Begin", placement: null });
    command(coordinator, "e", { kind: "connect_new", source: { kind: "focus" }, type: "end", label: "Finish" });
    const version = coordinator.getSnapshot().editor.engine.version;

    coordinator.playbackDispatch({ type: "start", graphVersion: version });
    coordinator.auditDispatch({ type: "open", graphVersion: version });
    expect(coordinator.getSnapshot()).toMatchObject({ playback: { status: "idle" }, audit: { status: "open" } });

    coordinator.playbackDispatch({ type: "start", graphVersion: version });
    expect(coordinator.getSnapshot()).toMatchObject({ playback: { status: "paused" }, audit: { status: "closed" } });
  });
});
