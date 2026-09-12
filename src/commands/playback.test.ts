import { describe, expect, it, vi } from "vitest";
import { createEditorCoordinator } from "../editor/coordinator";
import { createEngineState, execute } from "./execute";
import { parseLocal } from "./local";
import type { GraphCommand } from "./schema";

type Coordinator = ReturnType<typeof createEditorCoordinator>;

const add = (coordinator: Coordinator, idSeed: string, command: GraphCommand) =>
  coordinator.dispatch({ type: "command", idSeed, command });

async function say(coordinator: Coordinator, text: string, turnId: string) {
  await coordinator.turns.accept({ sessionId: "voice", turnId, text, final: true });
}

function linear(coordinator: Coordinator) {
  add(coordinator, "s", { kind: "add_node", type: "start", label: "Begin", placement: null });
  add(coordinator, "p", { kind: "add_node", type: "process", label: "Review", placement: null });
  add(coordinator, "e", { kind: "add_node", type: "end", label: "Finish", placement: null });
  add(coordinator, "sp", { kind: "connect", source: { kind: "id", value: "s-1" }, target: { kind: "id", value: "p-1" }, label: null });
  add(coordinator, "pe", { kind: "connect", source: { kind: "id", value: "p-1" }, target: { kind: "id", value: "e-1" }, label: null });
}

function branching(coordinator: Coordinator, duplicateLabel = false) {
  add(coordinator, "s", { kind: "add_node", type: "start", label: "Begin", placement: null });
  add(coordinator, "d", { kind: "add_node", type: "decision", label: "Approved?", placement: null });
  add(coordinator, "a", { kind: "add_node", type: "process", label: "Approve", placement: null });
  add(coordinator, "r", { kind: "add_node", type: "process", label: duplicateLabel ? "Review" : "Reject", placement: null });
  add(coordinator, "sd", { kind: "connect", source: { kind: "id", value: "s-1" }, target: { kind: "id", value: "d-1" }, label: null });
  add(coordinator, "yes", { kind: "connect", source: { kind: "id", value: "d-1" }, target: { kind: "id", value: "a-1" }, label: "Yes" });
  add(coordinator, "other", { kind: "connect", source: { kind: "id", value: "d-1" }, target: { kind: "id", value: "r-1" }, label: duplicateLabel ? "Yes" : "No" });
}

describe("local playback commands", () => {
  it.each([
    ["Start test", { kind: "playback", action: "start", choice: null }],
    ["Test chart.", { kind: "playback", action: "start", choice: null }],
    ["Stop test", { kind: "playback", action: "stop", choice: null }],
    ["Restart test", { kind: "playback", action: "restart", choice: null }],
    ["Repeat", { kind: "playback", action: "repeat", choice: null }],
    ["Take yes", { kind: "walk", direction: "next", branch: "yes" }],
  ] as const)("parses %s deterministically", (text, command) => {
    expect(parseLocal(text)).toEqual(command);
  });

  it("keeps playback commands out of the graph executor", () => {
    const state = createEngineState();
    const result = execute(state, { kind: "playback", action: "start", choice: null }, () => "unused");
    expect(result).toMatchObject({ outcome: "error", message: "Start Test chart mode first." });
    expect(result.state).toBe(state);
  });

  it("runs every core playback phrase locally without calling Gemini", async () => {
    const interpret = vi.fn(async () => ({ kind: "validate" } as GraphCommand));
    const coordinator = createEditorCoordinator(interpret);
    linear(coordinator);
    coordinator.turns.start("voice");

    await say(coordinator, "Test chart.", "1");
    await say(coordinator, "Repeat.", "2");
    await say(coordinator, "Restart test.", "3");
    await say(coordinator, "Stop test.", "4");
    await say(coordinator, "Start test.", "5");

    expect(interpret).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().presentation?.source).toBe("local");
    expect(coordinator.getSnapshot().playback.status).toBe("paused");
  });

  it("maps next, back, and where am I to playback without adding history", async () => {
    const interpret = vi.fn(async () => ({ kind: "validate" } as GraphCommand));
    const coordinator = createEditorCoordinator(interpret);
    linear(coordinator);
    const before = coordinator.getSnapshot().editor.engine;
    coordinator.playbackDispatch({ type: "start", graphVersion: before.version });
    coordinator.turns.start("voice");

    await say(coordinator, "Next.", "1");
    expect(coordinator.getSnapshot().playback.currentNodeId).toBe("p-1");
    const route = coordinator.getSnapshot().playback.route;
    await say(coordinator, "Where am I?", "2");
    expect(coordinator.getSnapshot().playback.route).toEqual(route);
    await say(coordinator, "Back.", "3");

    const after = coordinator.getSnapshot();
    expect(after.playback.currentNodeId).toBe("s-1");
    expect(after.editor.engine.version).toBe(before.version);
    expect(after.editor.engine.history).toEqual(before.history);
    expect(interpret).not.toHaveBeenCalled();
  });

  it("leaves ordinary walk navigation unchanged outside playback", async () => {
    const coordinator = createEditorCoordinator();
    linear(coordinator);
    add(coordinator, "focus", { kind: "focus", node: { kind: "id", value: "s-1" } });
    coordinator.turns.start("voice");

    await say(coordinator, "Next.", "1");

    expect(coordinator.getSnapshot().playback.status).toBe("idle");
    expect(coordinator.getSnapshot().editor.engine.focusedNodeId).toBe("p-1");
  });

  it.each(["Yes", "Approve"])("takes a branch named by its label or destination: %s", async spoken => {
    const interpret = vi.fn(async () => ({ kind: "validate" } as GraphCommand));
    const coordinator = createEditorCoordinator(interpret);
    branching(coordinator);
    const version = coordinator.getSnapshot().editor.engine.version;
    coordinator.playbackDispatch({ type: "start", graphVersion: version });
    coordinator.playbackDispatch({ type: "next", graphVersion: version });
    coordinator.turns.start("voice");

    await say(coordinator, `Take ${spoken}.`, "1");

    expect(coordinator.getSnapshot().playback.currentNodeId).toBe("a-1");
    expect(coordinator.getSnapshot().presentation).toMatchObject({ source: "local", status: "committed" });
    expect(interpret).not.toHaveBeenCalled();
  });

  it("retains the decision when a branch is missing or ambiguous and never reports IDs", async () => {
    const interpret = vi.fn(async () => ({ kind: "validate" } as GraphCommand));
    const coordinator = createEditorCoordinator(interpret);
    branching(coordinator, true);
    const version = coordinator.getSnapshot().editor.engine.version;
    coordinator.playbackDispatch({ type: "start", graphVersion: version });
    coordinator.playbackDispatch({ type: "next", graphVersion: version });
    coordinator.turns.start("voice");

    await say(coordinator, "Take maybe.", "1");
    expect(coordinator.getSnapshot().playback.currentNodeId).toBe("d-1");
    expect(coordinator.getSnapshot().presentation?.text).toBe("No branch here is called maybe.");

    await say(coordinator, "Take yes.", "2");
    const message = coordinator.getSnapshot().presentation?.text ?? "";
    expect(message).toContain("Yes to Approve");
    expect(message).toContain("Yes to Review");
    expect(message).not.toMatch(/(?:yes|other)-1/);
    expect(coordinator.getSnapshot().playback.currentNodeId).toBe("d-1");
    expect(interpret).not.toHaveBeenCalled();
  });
});
