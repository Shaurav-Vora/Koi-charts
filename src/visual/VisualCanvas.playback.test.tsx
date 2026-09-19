import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import VisualCanvas from "./VisualCanvas";
import { layoutGraph } from "./layout";
import type { FlowGraph } from "../graph/types";

const { fitView, setCenter } = vi.hoisted(() => ({ fitView: vi.fn(), setCenter: vi.fn() }));

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Background: () => null,
    BaseEdge: () => null,
    EdgeText: () => null,
    Handle: () => null,
    ConnectionMode: { Loose: "loose" },
    MarkerType: { ArrowClosed: "arrow-closed" },
    SelectionMode: { Partial: "partial" },
    Position: { Top: "top", Right: "right", Bottom: "bottom", Left: "left" },
    ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
    useNodesInitialized: () => false,
    useReactFlow: () => ({
      fitView,
      flowToScreenPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      getZoom: () => 1,
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      setCenter,
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }),
    ReactFlow: ({ nodes, edges, children, onEdgeClick, onEdgesChange, onConnectEnd, onSelectionChange, onSelectionEnd, selectionOnDrag, selectionMode, panOnDrag }: {
      nodes: Array<{ id: string; selected?: boolean; data: { playbackState?: string; compact?: boolean } }>;
      edges: Array<{ id: string; ariaLabel?: string; data: { playbackState?: string } }>;
      children: ReactNode;
      onEdgeClick?: (event: unknown, edge: unknown) => void;
      onEdgesChange?: (changes: Array<{ type: "select"; id: string; selected: boolean }>) => void;
      onConnectEnd?: (event: MouseEvent, state: { isValid: boolean; fromNode: { id: string } | null; toNode: { id: string } | null }) => void;
      onSelectionChange?: (selection: { nodes: Array<{id:string}>; edges: unknown[] }) => void;
      onSelectionEnd?: (_event: unknown) => void;
      selectionOnDrag?: boolean;
      selectionMode?: string;
      panOnDrag?: boolean | number[];
    }) => React.createElement(
      "div",
      { "data-testid": "react-flow", "data-selection-on-drag": selectionOnDrag, "data-selection-mode": selectionMode, "data-pan-on-drag": String(panOnDrag) },
      ...nodes.map(node => React.createElement("div", {
        key: node.id,
        "data-testid": "node-" + node.id,
        "data-playback-state": node.data.playbackState,
        "data-selected": node.selected,
        "data-compact": node.data.compact,
      })),
      ...edges.map(edge => React.createElement("div", {
        key: edge.id,
        role: "img",
        "aria-label": edge.ariaLabel,
        "data-testid": "edge-" + edge.id,
        "data-playback-state": edge.data.playbackState,
        onClick: event => {
          onEdgeClick?.(event, edge);
          onEdgesChange?.([{ type: "select", id: edge.id, selected: true }]);
        },
      })),
      React.createElement("button", {
        key: "marquee-select",
        type: "button",
        onClick: () => {
          const selection = { nodes: [{ id: "start" }, { id: "review" }], edges: [] };
          onSelectionChange?.(selection);
          onSelectionEnd?.({});
        },
      }, "Marquee select two shapes"),
      React.createElement("button", {
        key: "empty-drop",
        type: "button",
        onClick: () => onConnectEnd?.(new MouseEvent("mouseup", { clientX: 420, clientY: 280 }), { isValid: false, fromNode: { id: "review" }, toNode: null }),
      }, "Drop connection on empty canvas"),
      React.createElement("button", {
        key: "valid-drop",
        type: "button",
        onClick: () => onConnectEnd?.(new MouseEvent("mouseup", { clientX: 420, clientY: 280 }), { isValid: true, fromNode: { id: "review" }, toNode: { id: "approve" } }),
      }, "Complete valid connection"),
      children,
    ),
  };
});

const graph: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin" },
    { id: "review", type: "process", label: "Review" },
    { id: "approve", type: "end", label: "Approved" },
    { id: "other", type: "end", label: "Other" },
  ],
  edges: [
    { id: "start-review", source: "start", target: "review", label: "next" },
    { id: "review-approve", source: "review", target: "approve", label: "yes" },
    { id: "review-other", source: "review", target: "other", label: "no" },
  ],
};

describe("VisualCanvas playback route", () => {
  it("hides the navigation dock while another canvas overlay is open", () => {
    const navigationProps = {
      onWalk: vi.fn(),
      onDescribe: vi.fn(),
      onInspect: vi.fn(),
    };
    const { rerender } = render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()} {...navigationProps} />);

    expect(screen.getByRole("toolbar", { name: "Chart navigation and inspection" })).toBeVisible();
    rerender(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()} {...navigationProps} hideNavigationDock />);
    expect(screen.queryByRole("toolbar", { name: "Chart navigation and inspection" })).not.toBeInTheDocument();
  });

  it("keeps the Fit chart action at a readable zoom floor", () => {
    fitView.mockClear();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Fit chart" }));

    expect(fitView).toHaveBeenCalledWith({ padding: 0.25, minZoom: 0.8, maxZoom: 1, duration: 220 });
  });

  it("fits the arranged chart and then centres its focused shape", async () => {
    fitView.mockResolvedValue(undefined);
    const onArrange = vi.fn();
    const arrangedLayout = layoutGraph(graph, "standard", "topology");
    const { rerender } = render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={vi.fn()} onArrange={onArrange} />);

    fireEvent.click(screen.getByRole("button", { name: "Auto arrange chart" }));
    expect(onArrange).toHaveBeenCalledOnce();
    rerender(<VisualCanvas graph={graph} layout={arrangedLayout} focusedNodeId="review" onCommand={vi.fn()} onArrange={onArrange} />);

    const target = arrangedLayout.nodes.find(node => node.id === "review")!;
    await waitFor(() => expect(fitView).toHaveBeenCalledWith({ padding: 0.25, minZoom: 0.8, maxZoom: 1, duration: 220 }));
    await waitFor(() => expect(setCenter).toHaveBeenCalledWith(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { zoom: 1, duration: 220 },
    ));
  });

  it("centres a requested audit target while preserving the current zoom", () => {
    const layout = layoutGraph(graph);
    const target = layout.nodes.find(node => node.id === "review")!;

    render(<VisualCanvas
      graph={graph}
      layout={layout}
      focusedNodeId="review"
      onCommand={vi.fn()}
      centerRequest={{ key: "node:review:dead-end", nodeId: "review" }}
    />);

    expect(setCenter).toHaveBeenCalledWith(
      target.x + target.width / 2,
      target.y + target.height / 2,
      { zoom: 1, duration: 220 },
    );
  });

  it("marks visited, current, and unrelated route elements without relying on color", () => {
    render(<VisualCanvas
      graph={graph}
      layout={layoutGraph(graph)}
      focusedNodeId="approve"
      onCommand={vi.fn()}
      playbackRoute={[
        { nodeId: "start", viaEdgeId: null },
        { nodeId: "review", viaEdgeId: "start-review" },
        { nodeId: "approve", viaEdgeId: "review-approve" },
      ]}
    />);

    expect(screen.getByTestId("edge-start-review")).toHaveAttribute("data-playback-state", "visited");
    expect(screen.getByTestId("edge-review-approve")).toHaveAttribute("data-playback-state", "current");
    expect(screen.getByTestId("edge-review-other")).not.toHaveAttribute("data-playback-state");
    expect(screen.getByTestId("node-start")).toHaveAttribute("data-playback-state", "visited");
    expect(screen.getByTestId("node-approve")).toHaveAttribute("data-playback-state", "current");
    expect(screen.getByTestId("node-other")).not.toHaveAttribute("data-playback-state");
  });

  it("keeps the connection label in its accessible name", () => {
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()} />);

    expect(screen.getByRole("img", { name: "Edit arrow from Begin to Review labelled next" })).toBeInTheDocument();
  });

  it("opens an arrow with connection-specific feedback instead of clearing selection", () => {
    const onCommand = vi.fn();
    const onInspectEdge = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={onCommand} onInspectEdge={onInspectEdge} />);

    fireEvent.click(screen.getByRole("img", { name: "Edit arrow from Review to Approved labelled yes" }));

    expect(onInspectEdge).toHaveBeenCalledWith("review-approve");
    expect(onInspectEdge).toHaveBeenCalledTimes(1);
    expect(onCommand).not.toHaveBeenCalledWith({ kind: "clear_focus" });
  });

  it("opens the existing arrow editor for an external inspection request", () => {
    render(<VisualCanvas
      graph={graph}
      layout={layoutGraph(graph)}
      focusedNodeId={null}
      onCommand={vi.fn()}
      inspectEdgeRequest={{ key: "audit-edge-request", edgeId: "review-approve" }}
    />);

    expect(screen.getByRole("form", { name: "Selected arrow" })).toBeVisible();
  });

  it("clears stale canvas overlays when a project import reuses element IDs", async () => {
    const onSelectedNodeIdsChange = vi.fn();
    const onInspectEdgeRequestHandled = vi.fn();
    const shared = {
      graph,
      layout: layoutGraph(graph),
      focusedNodeId: null,
      onCommand: vi.fn(),
      selectedNodeIds: ["start", "review"],
      onSelectedNodeIdsChange,
      onInspectEdgeRequestHandled,
    };
    const { rerender } = render(<VisualCanvas {...shared} selectionResetKey={0} />);
    fireEvent.click(screen.getByRole("img", { name: "Edit arrow from Review to Approved labelled yes" }));
    expect(screen.getByRole("form", { name: "Selected arrow" })).toBeVisible();

    rerender(<VisualCanvas {...shared} selectionResetKey={1} />);

    await waitFor(() => expect(screen.queryByRole("form", { name: "Selected arrow" })).not.toBeInTheDocument());
    expect(onSelectedNodeIdsChange).toHaveBeenCalledWith([]);
    expect(onInspectEdgeRequestHandled).toHaveBeenCalled();
  });
  it("keeps the release point on the new shape edge when a connection is dropped on empty canvas", () => {
    const onCommand = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={onCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Drop connection on empty canvas" }));

    expect(screen.getByRole("dialog", { name: "Add connected shape" })).toBeVisible();
    expect(screen.getByTestId("pending-connection-line")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add connected start" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Add connected process" }));
    expect(onCommand).toHaveBeenCalledWith({
      kind: "compound",
      commands: [
        { kind: "add_node", type: "process", label: "Process", placement: null },
        { kind: "move_to", node: { kind: "recent" }, position: { x: 420, y: 237 } },
        { kind: "connect", source: { kind: "id", value: "review" }, target: { kind: "recent" }, label: null },
      ],
    });
    expect(screen.queryByRole("dialog", { name: "Add connected shape" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("pending-connection-line")).not.toBeInTheDocument();
  });

  it("does not open the chooser after a valid connection and closes it with Escape", () => {
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Complete valid connection" }));
    expect(screen.queryByRole("dialog", { name: "Add connected shape" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Drop connection on empty canvas" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Add connected shape" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Add connected shape" })).not.toBeInTheDocument();
  });

  it("deletes the selected connection with Delete while leaving label typing safe", () => {
    const onCommand = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={onCommand} />);

    fireEvent.click(screen.getByRole("img", { name: "Edit arrow from Begin to Review labelled next" }));
    const labelInput = screen.getByLabelText("Arrow label");
    expect(labelInput).not.toHaveFocus();
    fireEvent.keyDown(labelInput, { key: "Delete" });
    expect(onCommand).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Delete" });

    expect(onCommand).toHaveBeenLastCalledWith({ kind: "delete", target: { kind: "edge_id", id: "start-review" } });
    expect(onCommand).toHaveBeenCalledTimes(1);
  });

  it("supports partial marquee selection and compact bulk actions", () => {
    const onSelectedNodeIdsChange = vi.fn();
    const onSelectionComplete = vi.fn();
    const onDeleteSelected = vi.fn();
    const { rerender } = render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()}
      selectedNodeIds={[]} onSelectedNodeIdsChange={onSelectedNodeIdsChange} onSelectionComplete={onSelectionComplete} onDeleteSelected={onDeleteSelected} />);

    expect(screen.getByRole("button", { name: "Select multiple shapes" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-selection-on-drag", "false");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-selection-mode", "partial");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-pan-on-drag", "true");
    fireEvent.click(screen.getByRole("button", { name: "Select multiple shapes" }));
    expect(screen.getByRole("button", { name: "Select multiple shapes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-selection-on-drag", "true");
    expect(screen.getByTestId("react-flow")).toHaveAttribute("data-pan-on-drag", "false");
    fireEvent.click(screen.getByRole("button", { name: "Marquee select two shapes" }));
    expect(onSelectedNodeIdsChange).toHaveBeenCalledWith(["start", "review"]);
    expect(onSelectionComplete).toHaveBeenCalledWith(["start", "review"]);

    rerender(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={vi.fn()}
      selectedNodeIds={["start", "review"]} onSelectedNodeIdsChange={onSelectedNodeIdsChange} onSelectionComplete={onSelectionComplete} onDeleteSelected={onDeleteSelected} />);
    expect(screen.getByRole("group", { name: "2 shapes selected" })).toBeVisible();
    expect(screen.getByTestId("node-start")).toHaveAttribute("data-selected", "true");
    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));
    expect(onDeleteSelected).toHaveBeenCalledWith(["start", "review"]);
    fireEvent.click(screen.getByRole("button", { name: "Deselect all" }));
    expect(onSelectedNodeIdsChange).toHaveBeenLastCalledWith([]);
  });

  it("clears an arrow selection with Escape outside its editor", () => {
    const onCommand = vi.fn();
    const onInspectEdgeRequestHandled = vi.fn();
    const onSelectionComplete = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId={null} onCommand={onCommand}
      onInspectEdgeRequestHandled={onInspectEdgeRequestHandled} onSelectionComplete={onSelectionComplete} />);

    fireEvent.click(screen.getByRole("img", { name: "Edit arrow from Begin to Review labelled next" }));
    expect(screen.getByRole("form", { name: "Selected arrow" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("form", { name: "Selected arrow" })).not.toBeInTheDocument();
    expect(onInspectEdgeRequestHandled).toHaveBeenCalled();
    expect(onSelectionComplete).toHaveBeenCalledWith([]);
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("clears a multi-selection with Escape outside editable fields", () => {
    const onCommand = vi.fn();
    const onSelectedNodeIdsChange = vi.fn();
    const onSelectionComplete = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={onCommand}
      selectedNodeIds={["start", "review"]} onSelectedNodeIdsChange={onSelectedNodeIdsChange} onSelectionComplete={onSelectionComplete} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onSelectedNodeIdsChange).toHaveBeenCalledWith([]);
    expect(onSelectionComplete).toHaveBeenCalledWith([]);
    expect(onCommand).not.toHaveBeenCalled();
  });

  it("passes compact presentation state to every node", () => {
    const onCommand = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph, "compact")} focusedNodeId={null} onCommand={onCommand} compactNodes onToggleCompactNodes={vi.fn()} />);
    expect(screen.getByTestId("node-start")).toHaveAttribute("data-compact", "true");
    expect(screen.getByRole("button", { name: "Use compact nodes" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Drop connection on empty canvas" }));
    fireEvent.click(screen.getByRole("button", { name: "Add connected process" }));
    expect(onCommand).toHaveBeenCalledWith(expect.objectContaining({
      kind: "compound",
      commands: expect.arrayContaining([
        { kind: "move_to", node: { kind: "recent" }, position: { x: 420, y: 253 } },
      ]),
    }));
  });
});
