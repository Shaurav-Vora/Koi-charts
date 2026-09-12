import { describe, expect, it } from "vitest";
import { createEditorCoordinator } from "./coordinator";

describe("editor playback integration", () => {
  it("starts at the Start node, synchronizes focus, and preserves graph history", () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({
      type: "command",
      idSeed: "a",
      command: { kind: "add_node", type: "start", label: "Begin", placement: null },
    });
    const before = coordinator.getSnapshot().editor.engine;

    coordinator.playbackDispatch({ type: "start", graphVersion: before.version });

    const after = coordinator.getSnapshot();
    expect(after.playback.currentNodeId).toBe(after.editor.engine.focusedNodeId);
    expect(after.playback.currentNodeId).toBe("a-1");
    expect(after.editor.engine.version).toBe(before.version);
    expect(after.editor.engine.history).toEqual(before.history);
  });

  it("synchronizes focus as playback advances without adding undo entries", () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({
      type: "command",
      idSeed: "a",
      command: { kind: "add_node", type: "start", label: "Begin", placement: null },
    });
    coordinator.dispatch({
      type: "command",
      idSeed: "b",
      command: { kind: "connect_new", source: { kind: "focus" }, type: "process", label: "Review" },
    });
    const before = coordinator.getSnapshot().editor.engine;
    coordinator.playbackDispatch({ type: "start", graphVersion: before.version });

    coordinator.playbackDispatch({ type: "next", graphVersion: before.version });

    const after = coordinator.getSnapshot();
    expect(after.playback.currentNodeId).toBe(after.editor.engine.focusedNodeId);
    expect(after.editor.engine.graph.nodes.find(node => node.id === after.playback.currentNodeId)?.label).toBe("Review");
    expect(after.editor.engine.version).toBe(before.version);
    expect(after.editor.engine.history).toEqual(before.history);
  });

  it("blocks active playback when a committed edit changes the graph", () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({
      type: "command",
      idSeed: "a",
      command: { kind: "add_node", type: "start", label: "Begin", placement: null },
    });
    const version = coordinator.getSnapshot().editor.engine.version;
    coordinator.playbackDispatch({ type: "start", graphVersion: version });

    coordinator.dispatch({
      type: "command",
      idSeed: "b",
      command: { kind: "add_node", type: "process", label: "Changed", placement: null },
    });

    expect(coordinator.getSnapshot().playback).toMatchObject({
      status: "blocked",
      message: "The chart changed. Restart the test to use the updated structure.",
    });
  });
});
