// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { FlowGraph } from "../graph/types";
import { createEditorCoordinator } from "./coordinator";
import { createEditorState, editorReducer } from "./reducer";

const importedGraph: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "review", type: "process", label: "Review order", position: { x: 320, y: 80 } },
    { id: "begin", type: "start", label: "Begin", position: { x: 40, y: 80 } },
  ],
  edges: [{ id: "begin-review", source: "begin", target: "review", label: "next" }],
};

function chartState() {
  let state = createEditorState();
  state = editorReducer(state, {
    type: "command",
    idSeed: "original-start",
    command: { kind: "add_node", type: "start", label: "Original", placement: null },
  });
  state = editorReducer(state, {
    type: "command",
    idSeed: "original-process",
    command: { kind: "connect_new", source: { kind: "focus" }, type: "process", label: "Old step" },
  });
  return state;
}

describe("editable project import", () => {
  it("replaces the graph as one undoable edit and focuses its first Start node", () => {
    const before = chartState();
    const current = editorReducer(before, {
      type: "command",
      idSeed: "delete",
      command: { kind: "delete", target: { kind: "node", node: { kind: "focus" } } },
    });
    expect(current.engine.pending?.kind).toBe("deletion");

    const loaded = editorReducer(current, {
      type: "import_project",
      graph: importedGraph,
      filename: "C:\\Downloads\\checkout-flow.koi",
    });

    expect(loaded.engine.graph).toEqual(importedGraph);
    expect(loaded.engine.graph).not.toBe(importedGraph);
    expect(loaded.engine.focusedNodeId).toBe("begin");
    expect(loaded.engine.recentNodeId).toBe("begin");
    expect(loaded.engine.pending).toBeNull();
    expect(loaded.engine.version).toBe(current.engine.version + 1);
    expect(loaded.engine.history.past).toHaveLength(current.engine.history.past.length + 1);
    expect(loaded.engine.history.future).toEqual([]);
    expect(loaded.message).toBe("Loaded 2 shapes and 1 connection from checkout-flow.koi. Undo restores your previous chart.");

    const undone = editorReducer(loaded, { type: "command", idSeed: "undo", command: { kind: "undo" } });
    expect(undone.engine.graph).toEqual(before.engine.graph);
    expect(undone.engine.focusedNodeId).toBe(before.engine.focusedNodeId);
    expect(undone.engine.recentNodeId).toBe(before.engine.recentNodeId);

    const redone = editorReducer(undone, { type: "command", idSeed: "redo", command: { kind: "redo" } });
    expect(redone.engine.graph).toEqual(importedGraph);
    expect(redone.engine.focusedNodeId).toBe("begin");
  });

  it("falls back to the first node and supports an empty project", () => {
    const before = chartState();
    const withoutStart: FlowGraph = {
      schemaVersion: 1,
      nodes: [{ id: "only", type: "process", label: "Only step" }],
      edges: [],
    };

    const loaded = editorReducer(before, { type: "import_project", graph: withoutStart, filename: "/tmp/one.koi" });
    expect(loaded.engine.focusedNodeId).toBe("only");
    expect(loaded.message).toBe("Loaded 1 shape and 0 connections from one.koi. Undo restores your previous chart.");

    const empty = editorReducer(loaded, {
      type: "import_project",
      graph: { schemaVersion: 1, nodes: [], edges: [] },
      filename: "empty.koi",
    });
    expect(empty.engine.focusedNodeId).toBeNull();
    expect(empty.engine.recentNodeId).toBeNull();
    expect(empty.message).toBe("Loaded an empty chart from empty.koi. Undo restores your previous chart.");
  });

  it("closes playback and transient presentation after a successful import", () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({ type: "command", idSeed: "s", command: { kind: "add_node", type: "start", label: "Begin", placement: null } });
    coordinator.playbackDispatch({ type: "start", graphVersion: coordinator.getSnapshot().editor.engine.version });
    coordinator.present({ status: "committed", preview: null, text: "Old feedback" });
    const listener = vi.fn();
    coordinator.subscribe(listener);

    const result = coordinator.importProject(importedGraph, "checkout-flow.koi");

    expect(result.outcome).toBe("committed");
    expect(coordinator.getSnapshot()).toMatchObject({
      presentation: null,
      playback: { status: "idle" },
      audit: { status: "closed" },
      projectImportKey: 1,
    });
    expect(listener).toHaveBeenCalledOnce();
  });

  it("preserves coordinator state when an invalid graph reaches the import boundary", () => {
    const coordinator = createEditorCoordinator();
    coordinator.present({ status: "committed", preview: null, text: "Keep this feedback" });
    const before = coordinator.getSnapshot();
    const invalid = {
      schemaVersion: 1,
      nodes: [{ id: "only", type: "start", label: "Only" }],
      edges: [{ id: "broken", source: "only", target: "missing" }],
    } as FlowGraph;

    const result = coordinator.importProject(invalid, "broken.koi");

    expect(result.outcome).toBe("error");
    expect(coordinator.getSnapshot()).toBe(before);
  });

  it("closes an open chart check after import", () => {
    const coordinator = createEditorCoordinator();
    coordinator.auditDispatch({ type: "open", graphVersion: 0 });
    expect(coordinator.getSnapshot().audit.status).toBe("open");

    coordinator.importProject(importedGraph, "checkout-flow.koi");

    expect(coordinator.getSnapshot().audit.status).toBe("closed");
    expect(coordinator.getSnapshot().projectImportKey).toBe(1);
  });
});
