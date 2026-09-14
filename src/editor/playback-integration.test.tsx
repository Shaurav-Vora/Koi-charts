import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";

vi.mock("../visual/VisualCanvas", () => ({
  default: ({ centerRequest, inspectEdgeRequest }: {
    centerRequest?: { key: string; nodeId: string } | null;
    inspectEdgeRequest?: { key: string; edgeId: string } | null;
  }) => (
    <div
      data-testid="visual-canvas"
      data-center-key={centerRequest?.key}
      data-center-node={centerRequest?.nodeId}
      data-inspect-edge={inspectEdgeRequest?.edgeId}
    />
  ),
}));

describe("editor playback integration", () => {
  it("keeps both review tools in one compact canvas group", () => {
    render(<Editor />);

    const tools = screen.getByRole("group", { name: "Chart review tools" });
    expect(tools.parentElement).toHaveClass("canvas-wrap");
    expect(within(tools).getByRole("region", { name: "Test chart" })).toHaveClass("is-compact");
    expect(within(tools).getByRole("region", { name: "Check chart" })).toHaveClass("is-compact");
  });

  it("opens the structured chart check without showing guided playback over it", () => {
    render(<Editor />);

    fireEvent.click(screen.getByRole("button", { name: "Check chart" }));

    expect(screen.getByRole("region", { name: "Check chart" })).toHaveClass("is-compact");
    expect(screen.getByRole("button", { name: "Check chart" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("2 issues")).toBeVisible();
    expect(screen.getByRole("region", { name: "Test chart" })).toHaveClass("is-compact");
  });

  it("requests canvas centering when audit navigation changes the target node", () => {
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
    coordinator.dispatch({
      type: "command",
      idSeed: "c",
      command: { kind: "add_node", type: "end", label: "Finish", placement: null },
    });
    render(<Editor coordinator={coordinator} />);

    fireEvent.click(screen.getByRole("button", { name: "Check chart" }));
    expect(screen.getByTestId("visual-canvas")).toHaveAttribute("data-center-node", "c-1");
    expect(screen.queryByRole("form", { name: "Selected shape" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next issue" }));
    expect(screen.getByTestId("visual-canvas")).toHaveAttribute("data-center-node", "b-1");
  });

  it("applies a safe audit fix through graph history and recalculates the open review", () => {
    const coordinator = createEditorCoordinator();
    render(<Editor coordinator={coordinator} />);

    fireEvent.click(screen.getByRole("button", { name: "Check chart" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Start" }));

    const snapshot = coordinator.getSnapshot();
    expect(snapshot.editor.engine.graph.nodes).toEqual([
      expect.objectContaining({ type: "start", label: "Start" }),
    ]);
    expect(snapshot.editor.engine.history.past).toHaveLength(1);
    expect(snapshot.audit.status).toBe("open");
    expect(screen.getByRole("heading", { name: "Add an End node" })).toBeVisible();

    coordinator.dispatch({ type: "command", idSeed: "undo", command: { kind: "undo" } });
    expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(0);
  });

  it("closes chart review and routes an unlabelled branch to the arrow editor", () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({ type: "command", idSeed: "a", command: { kind: "add_node", type: "start", label: "Begin", placement: null } });
    coordinator.dispatch({ type: "command", idSeed: "b", command: { kind: "connect_new", source: { kind: "focus" }, type: "decision", label: "Approved?" } });
    coordinator.dispatch({ type: "command", idSeed: "c", command: { kind: "connect_new", source: { kind: "focus" }, type: "end", label: "Finish" } });
    render(<Editor coordinator={coordinator} />);

    fireEvent.click(screen.getByRole("button", { name: "Check chart" }));
    fireEvent.click(screen.getByRole("button", { name: "Next issue" }));
    fireEvent.click(screen.getByRole("button", { name: "Label connection" }));

    expect(coordinator.getSnapshot().audit.status).toBe("closed");
    expect(screen.getByTestId("visual-canvas")).toHaveAttribute("data-inspect-edge", "c-2");
    expect(screen.queryByRole("form", { name: "Selected shape" })).not.toBeInTheDocument();
  });

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

  it("shows the recorded route inside the chart outline and marks the current step", () => {
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
    const version = coordinator.getSnapshot().editor.engine.version;
    coordinator.playbackDispatch({ type: "start", graphVersion: version });
    coordinator.playbackDispatch({ type: "next", graphVersion: version });

    render(<Editor coordinator={coordinator} />);

    expect(screen.getByRole("button", { name: "Test chart" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("form", { name: "Selected shape" })).not.toBeInTheDocument();
    const route = screen.getByRole("list", { name: "Playback route" });
    expect(within(route).getAllByRole("listitem")).toHaveLength(2);
    expect(within(route).getByText("Begin")).not.toHaveAttribute("aria-current");
    expect(within(route).getByText("Review")).toHaveAttribute("aria-current", "step");
  });
});
