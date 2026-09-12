import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FlowGraph } from "../graph/types";
import { createPlaybackState, playbackTransition } from "./engine";
import PlaybackPanel from "./PlaybackPanel";

const graph: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin" },
    { id: "decision", type: "decision", label: "Approved?" },
    { id: "approve", type: "process", label: "Approve" },
    { id: "reject", type: "process", label: "Reject" },
  ],
  edges: [
    { id: "to-decision", source: "start", target: "decision" },
    { id: "yes", source: "decision", target: "approve", label: "Yes" },
    { id: "no", source: "decision", target: "reject", label: "No" },
  ],
};

describe("PlaybackPanel", () => {
  it("starts a chart test from its named region", () => {
    const onAction = vi.fn();
    render(<PlaybackPanel graph={graph} graphVersion={3} state={createPlaybackState()} onAction={onAction} />);

    const panel = screen.getByRole("region", { name: "Test chart" });
    expect(panel).toBeVisible();
    expect(panel).toHaveClass("is-compact");
    expect(screen.queryByText("Follow the chart one node at a time and choose every branch yourself.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Test chart" }));

    expect(onAction).toHaveBeenCalledWith({ type: "start", graphVersion: 3 });
  });

  it("offers step controls and disables Back at the first route entry", () => {
    const onAction = vi.fn();
    const state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 3 });
    render(<PlaybackPanel graph={graph} graphVersion={3} state={state} onAction={onAction} />);

    expect(screen.getByText("Step 1 · Begin")).toBeVisible();
    expect(screen.getByRole("button", { name: "Back one step" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Repeat step" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Stop test" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));

    expect(onAction).toHaveBeenCalledWith({ type: "next", graphVersion: 3 });
  });

  it("renders explicit branch choices without choosing one automatically", () => {
    const onAction = vi.fn();
    let state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 3 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 3 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 3 });
    render(<PlaybackPanel graph={graph} graphVersion={3} state={state} onAction={onAction} />);

    fireEvent.click(screen.getByRole("button", { name: "Take Yes to Approve" }));

    expect(onAction).toHaveBeenCalledWith({ type: "choose_branch", edgeId: "yes", graphVersion: 3 });
    expect(screen.getByRole("button", { name: "Take No to Reject" })).toBeEnabled();
  });

  it("offers Restart after completion or blockage", () => {
    const onAction = vi.fn();
    const blocked = {
      ...createPlaybackState(),
      status: "blocked" as const,
      graphVersion: 2,
      currentNodeId: "decision",
      route: [
        { nodeId: "start", viaEdgeId: null },
        { nodeId: "decision", viaEdgeId: "to-decision" },
      ],
      message: "The chart changed. Restart the test to use the updated structure.",
    };
    render(<PlaybackPanel graph={graph} graphVersion={3} state={blocked} onAction={onAction} />);

    expect(screen.getByRole("button", { name: "Back one step" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Repeat step" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restart test" }));

    expect(onAction).toHaveBeenCalledWith({ type: "restart", graphVersion: 3 });
  });
});
