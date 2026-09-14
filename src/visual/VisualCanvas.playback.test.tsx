import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import VisualCanvas from "./VisualCanvas";
import { layoutGraph } from "./layout";
import type { FlowGraph } from "../graph/types";

const { setCenter } = vi.hoisted(() => ({ setCenter: vi.fn() }));

vi.mock("@xyflow/react", async () => {
  const React = await import("react");
  return {
    Background: () => null,
    BaseEdge: () => null,
    EdgeText: () => null,
    Handle: () => null,
    ConnectionMode: { Loose: "loose" },
    MarkerType: { ArrowClosed: "arrow-closed" },
    Position: { Top: "top", Right: "right", Bottom: "bottom", Left: "left" },
    ReactFlowProvider: ({ children }: { children: ReactNode }) => children,
    useNodesInitialized: () => false,
    useReactFlow: () => ({
      fitView: vi.fn(),
      getZoom: () => 1,
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
      setCenter,
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
    }),
    ReactFlow: ({ nodes, edges, children, onEdgeClick, onEdgesChange, onConnectEnd }: {
      nodes: Array<{ id: string; data: { playbackState?: string } }>;
      edges: Array<{ id: string; ariaLabel?: string; data: { playbackState?: string } }>;
      children: ReactNode;
      onEdgeClick?: (event: unknown, edge: unknown) => void;
      onEdgesChange?: (changes: Array<{ type: "select"; id: string; selected: boolean }>) => void;
      onConnectEnd?: (event: MouseEvent, state: { isValid: boolean; fromNode: { id: string } | null; toNode: { id: string } | null }) => void;
    }) => React.createElement(
      "div",
      null,
      ...nodes.map(node => React.createElement("div", {
        key: node.id,
        "data-testid": "node-" + node.id,
        "data-playback-state": node.data.playbackState,
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

  it("offers shape choices when a connection is dropped on empty canvas", () => {
    const onCommand = vi.fn();
    render(<VisualCanvas graph={graph} layout={layoutGraph(graph)} focusedNodeId="review" onCommand={onCommand} />);

    fireEvent.click(screen.getByRole("button", { name: "Drop connection on empty canvas" }));

    expect(screen.getByRole("dialog", { name: "Add connected shape" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Add connected start" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Add connected process" }));
    expect(onCommand).toHaveBeenCalledWith({
      kind: "compound",
      commands: [
        { kind: "add_node", type: "process", label: "Process", placement: null },
        { kind: "move_to", node: { kind: "recent" }, position: { x: 325, y: 237 } },
        { kind: "connect", source: { kind: "id", value: "review" }, target: { kind: "recent" }, label: null },
      ],
    });
    expect(screen.queryByRole("dialog", { name: "Add connected shape" })).not.toBeInTheDocument();
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
});
