import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import { createPlaybackState, playbackTransition } from "./engine";

const linear: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin" },
    { id: "work", type: "process", label: "Check details" },
    { id: "end", type: "end", label: "Finished" },
  ],
  edges: [
    { id: "a", source: "start", target: "work", label: "next" },
    { id: "b", source: "work", target: "end", label: "done" },
  ],
};

describe("playback engine", () => {
  it("pauses at each node and records a linear route through End", () => {
    let state = playbackTransition(linear, createPlaybackState(), { type: "start", graphVersion: 4 });
    expect(state).toMatchObject({
      status: "paused",
      graphVersion: 4,
      currentNodeId: "start",
      route: [{ nodeId: "start", viaEdgeId: null }],
      visitCounts: { start: 1 },
    });

    state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
    expect(state.currentNodeId).toBe("work");
    expect(state.status).toBe("paused");
    expect(state.route.map(step => step.nodeId)).toEqual(["start", "work"]);

    state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
    expect(state.currentNodeId).toBe("end");
    expect(state.status).toBe("complete");
    expect(state.route).toEqual([
      { nodeId: "start", viaEdgeId: null },
      { nodeId: "work", viaEdgeId: "a" },
      { nodeId: "end", viaEdgeId: "b" },
    ]);
  });

  it("blocks an empty or startless chart with an actionable message", () => {
    const empty: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };
    expect(playbackTransition(empty, createPlaybackState(), { type: "start", graphVersion: 0 })).toMatchObject({
      status: "blocked",
      currentNodeId: null,
      message: "Add a Start node before testing.",
    });
    const endOnly: FlowGraph = { schemaVersion: 1, nodes: [{ id: "e", type: "end", label: "Finish" }], edges: [] };
    expect(playbackTransition(endOnly, createPlaybackState(), { type: "start", graphVersion: 1 }).message).toBe("Add a Start node before testing.");
  });

  it("requires an explicit choice when a chart has multiple Start nodes", () => {
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "b", type: "start", label: "Second beginning" },
        { id: "a", type: "start", label: "First beginning" },
        { id: "e", type: "end", label: "Finish" },
      ],
      edges: [],
    };
    const choosing = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 2 });
    expect(choosing).toMatchObject({
      status: "choosing_start",
      currentNodeId: null,
      route: [],
      choices: [
        { id: "a", label: "First beginning", destinationLabel: "First beginning" },
        { id: "b", label: "Second beginning", destinationLabel: "Second beginning" },
      ],
    });
    const refused = playbackTransition(graph, choosing, { type: "choose_start", nodeId: "missing", graphVersion: 2 });
    expect(refused.status).toBe("choosing_start");
    expect(refused.message).not.toContain("missing");
    const selected = playbackTransition(graph, choosing, { type: "choose_start", nodeId: "b", graphVersion: 2 });
    expect(selected).toMatchObject({ status: "paused", currentNodeId: "b", route: [{ nodeId: "b", viaEdgeId: null }] });
  });

  it("offers every branch without guessing and accepts only an offered edge", () => {
    const graph = branchingGraph([
      { id: "yes", source: "decision", target: "approve", label: "Yes" },
      { id: "no", source: "decision", target: "reject", label: "No" },
    ]);
    let state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 1 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    const atDecision = state;
    const choosing = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    expect(choosing.status).toBe("choosing_branch");
    expect(choosing.currentNodeId).toBe("decision");
    expect(choosing.route).toEqual(atDecision.route);
    expect(choosing.choices.map(item => item.label)).toEqual(["No to Reject", "Yes to Approve"]);

    const refused = playbackTransition(graph, choosing, { type: "choose_branch", edgeId: "not-offered", graphVersion: 1 });
    expect(refused.status).toBe("choosing_branch");
    expect(refused.route).toEqual(choosing.route);
    expect(refused.message).not.toContain("not-offered");

    const selected = playbackTransition(graph, choosing, { type: "choose_branch", edgeId: "yes", graphVersion: 1 });
    expect(selected).toMatchObject({ status: "paused", currentNodeId: "approve" });
    expect(selected.route.at(-1)).toEqual({ nodeId: "approve", viaEdgeId: "yes" });
  });

  it("names unlabelled and duplicate branches by their destinations", () => {
    const graph = branchingGraph([
      { id: "a", source: "decision", target: "approve" },
      { id: "b", source: "decision", target: "reject", label: "Yes" },
      { id: "c", source: "decision", target: "review", label: "Yes" },
    ]);
    let state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 1 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    expect(state.choices.map(choice => choice.label)).toEqual([
      "Unlabelled to Approve",
      "Yes to Reject",
      "Yes to Review",
    ]);
    expect(state.warnings).toContain("Decision Choose route has an unlabelled branch to Approve.");
    expect(state.warnings).toContain("Decision Choose route repeats the branch label Yes.");
  });

  it("goes Back through the route actually taken and repairs visit counts", () => {
    let state = playbackTransition(linear, createPlaybackState(), { type: "start", graphVersion: 4 });
    state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
    state = playbackTransition(linear, state, { type: "back", graphVersion: 4 });
    expect(state).toMatchObject({
      status: "paused",
      currentNodeId: "start",
      route: [{ nodeId: "start", viaEdgeId: null }],
      visitCounts: { start: 1 },
    });
    expect(state.visitCounts).not.toHaveProperty("work");
    const first = playbackTransition(linear, state, { type: "back", graphVersion: 4 });
    expect(first.currentNodeId).toBe("start");
    expect(first.message).toBe("Already at the first playback step.");
  });

  it("blocks at a non-End dead end without discarding the route", () => {
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "s", type: "start", label: "Begin" },
        { id: "p", type: "process", label: "Orphaned task" },
      ],
      edges: [{ id: "sp", source: "s", target: "p" }],
    };
    let state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 1 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    const route = state.route;
    state = playbackTransition(graph, state, { type: "next", graphVersion: 1 });
    expect(state.status).toBe("blocked");
    expect(state.message).toBe("Orphaned task is a dead end. Add an outgoing connection or stop the test.");
    expect(state.route).toEqual(route);
  });

  it("reports a loop when a node is revisited and retains the repeated step", () => {
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "s", type: "start", label: "Begin" },
        { id: "p", type: "process", label: "Retry" },
      ],
      edges: [
        { id: "sp", source: "s", target: "p" },
        { id: "ps", source: "p", target: "s", label: "again" },
      ],
    };
    let state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 3 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 3 });
    state = playbackTransition(graph, state, { type: "next", graphVersion: 3 });
    expect(state).toMatchObject({
      status: "paused",
      currentNodeId: "s",
      visitCounts: { s: 2, p: 1 },
      message: "Loop detected at Begin. Ready for the next step.",
    });
    expect(state.route.map(step => step.nodeId)).toEqual(["s", "p", "s"]);
  });

  it("reports missing End and unreachable nodes using labels only", () => {
    const graph: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "opaque-start-id", type: "start", label: "Begin" },
        { id: "opaque-work-id", type: "process", label: "Reachable" },
        { id: "opaque-island-id", type: "process", label: "Island" },
      ],
      edges: [{ id: "opaque-edge-id", source: "opaque-start-id", target: "opaque-work-id" }],
    };
    const state = playbackTransition(graph, createPlaybackState(), { type: "start", graphVersion: 8 });
    expect(state.warnings).toEqual(["No End node.", "Unreachable nodes: Island."]);
    expect(state.warnings.join(" ")).not.toContain("opaque");
  });

  it("invalidates stale playback before following graph IDs", () => {
    const started = playbackTransition(linear, createPlaybackState(), { type: "start", graphVersion: 4 });
    const stale = playbackTransition(linear, started, { type: "next", graphVersion: 5 });
    expect(stale).toMatchObject({
      status: "blocked",
      currentNodeId: "start",
      choices: [],
      message: "The chart changed. Restart the test to use the updated structure.",
    });
    expect(stale.route).toEqual(started.route);
  });

  it("supports Repeat, Restart and Stop without changing the graph", () => {
    const before = structuredClone(linear);
    let state = playbackTransition(linear, createPlaybackState(), { type: "start", graphVersion: 4 });
    state = playbackTransition(linear, state, { type: "next", graphVersion: 4 });
    const repeated = playbackTransition(linear, state, { type: "repeat", graphVersion: 4 });
    expect(repeated.currentNodeId).toBe("work");
    expect(repeated.route).toEqual(state.route);
    expect(repeated.message).toContain("Check details");

    const restarted = playbackTransition(linear, repeated, { type: "restart", graphVersion: 4 });
    expect(restarted).toMatchObject({ status: "paused", currentNodeId: "start", route: [{ nodeId: "start", viaEdgeId: null }] });

    const stopped = playbackTransition(linear, restarted, { type: "stop", graphVersion: 4 });
    expect(stopped).toEqual(createPlaybackState());
    expect(linear).toEqual(before);
  });
});

function branchingGraph(branches: FlowGraph["edges"]): FlowGraph {
  return {
    schemaVersion: 1,
    nodes: [
      { id: "start", type: "start", label: "Begin" },
      { id: "decision", type: "decision", label: "Choose route" },
      { id: "approve", type: "process", label: "Approve" },
      { id: "reject", type: "process", label: "Reject" },
      { id: "review", type: "process", label: "Review" },
      { id: "end", type: "end", label: "Finish" },
    ],
    edges: [
      { id: "start-decision", source: "start", target: "decision" },
      ...branches,
    ],
  };
}
