// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEngineState, execute, resolveClarification } from "./execute";
import type { EngineState } from "../graph/types";
import { graphFixture } from "../test/fixtures";

const id = (value: string) => ({ kind: "id", value });
const label = (value: string) => ({ kind: "label", value });
const add = (name = "New") => ({ kind: "add_node", type: "process", label: name, placement: null });
const del = (value: string) => ({ kind: "delete", target: { kind: "node", node: id(value) } });
const rename = (value: string, newLabel: string) => ({ kind: "rename", node: id(value), newLabel });
const ids = () => { let n = 0; return () => `generated-${++n}`; };
function state(): EngineState { return { ...createEngineState(), graph: graphFixture(), focusedNodeId: "n2", recentNodeId: "n2" }; }
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

describe("safe edits and history", () => {
  it("undoing confirmed deletion restores connections, placement, focus, and recent node", () => {
    const before = state(); before.graph.nodes[0].placement = { relation: "above", referenceNodeId: "n2" };
    const pending = execute(freeze(before), del("n2"), ids()).state;
    const deleted = execute(pending, { kind: "confirm" }, ids()).state;
    const restored = execute(freeze(deleted), { kind: "undo" }, ids()).state;
    expect(restored.graph).toEqual(before.graph);
    expect(restored.focusedNodeId).toBe("n2"); expect(restored.recentNodeId).toBe("n2");
    expect(execute(restored, { kind: "redo" }, ids()).state.graph).toEqual(deleted.graph);
  });
  it("an edge label distinguishes parallel connections", () => {
    const before = state(); before.graph.edges.push({ id: "e4", source: "n3", target: "n4", label: "no" });
    const result = execute(before, { kind: "delete", target: { kind: "edge", source: id("n3"), target: id("n4"), label: "yes" } }, ids());
    expect(result.outcome).toBe("committed");
    expect(result.state.graph.edges.map(edge => edge.id)).toEqual(["e1", "e2", "e4"]);
  });
  it("cancelling compound deletion also discards its provisional additions", () => {
    const before = state();
    const pending = execute(before, { kind: "compound", commands: [add("Provisional"), del("n2")] }, ids()).state;
    expect(execute(pending, { kind: "cancel" }, ids()).state).toEqual(before);
  });
  it("resolves a destructive ambiguity before asking for deletion confirmation", () => {
    const before = state(); before.graph.nodes[0].label = "Check"; before.graph.nodes[1].label = "Check";
    const ambiguous = execute(before, { kind: "delete", target: { kind: "node", node: label("Check") } }, ids());
    expect(ambiguous.outcome).toBe("clarification");
    const pending = resolveClarification(ambiguous.state, "n2", ids());
    expect(pending.outcome).toBe("confirmation"); expect(pending.state.graph).toEqual(before.graph);
    const result = execute(pending.state, { kind: "confirm" }, ids());
    expect(result.state.graph.nodes.map(node => node.id)).toEqual(["n1", "n3", "n4"]);
    expect(result.state.history.past).toHaveLength(1);
  });
  it("adds an opaque-ID node without mutating frozen input", () => {
    const before = freeze(createEngineState());
    const result = execute(before, add("Check"), () => "opaque");
    expect(result.outcome).toBe("committed");
    expect(result.state.graph.nodes).toEqual([{ id: "opaque", type: "process", label: "Check" }]);
    expect(result.state.focusedNodeId).toBe("opaque");
    expect(result.state.recentNodeId).toBe("opaque");
    expect(result.state.history.past).toHaveLength(1);
    expect(before.graph.nodes).toEqual([]);
  });
  it.each(["before", "after", "above", "below", "left_of", "right_of"])("applies %s placement without adding an edge", relation => {
    const result = execute(freeze(state()), { ...add(), placement: { relation, reference: id("n1") } }, ids());
    expect(result.outcome).toBe("committed");
    expect(result.state.graph.nodes.at(-1)?.placement).toEqual({ relation, referenceNodeId: "n1" });
    expect(result.state.graph.edges).toHaveLength(3);
  });
  it("connects existing nodes and allows multi-node cycles", () => {
    const result = execute(freeze(state()), { kind: "connect", source: id("n3"), target: id("n2"), label: "retry" }, ids());
    expect(result.outcome).toBe("committed");
    expect(result.state.graph.edges.at(-1)).toEqual({ id: "generated-1", source: "n3", target: "n2", label: "retry" });
  });
  it("renames without changing identity or links", () => {
    const result = execute(freeze(state()), rename("n2", "Validate payment"), ids());
    expect(result.state.graph.nodes[1]).toEqual({ id: "n2", type: "process", label: "Validate payment" });
    expect(result.state.graph.edges).toEqual(state().graph.edges);
  });
  it("moves a node without changing connections", () => {
    const result = execute(freeze(state()), { kind: "move", node: id("n2"), placement: { relation: "below", reference: id("n3") } }, ids());
    expect(result.state.graph.nodes[1].placement).toEqual({ relation: "below", referenceNodeId: "n3" });
    expect(result.state.graph.edges).toEqual(state().graph.edges);
  });
  it.each([
    { kind: "undo", surprise: true }, rename("missing", "New"), rename("n1", "   "),
    { kind: "connect", source: id("n1"), target: id("missing"), label: null },
    { kind: "connect", source: id("n1"), target: id("n1"), label: null },
    { kind: "move", node: id("n1"), placement: { relation: "below", reference: id("n1") } },
    { ...add(), placement: { relation: "after", reference: id("missing") } },
  ])("rejects invalid edits without any mutation: %j", command => {
    const before = freeze(state()); const result = execute(before, command, ids());
    expect(result.outcome).toBe("error"); expect(result.state).toEqual(before);
  });
  it("rejects a colliding generated ID", () => {
    const before = freeze(state());
    expect(execute(before, add(), () => "n1").state).toEqual(before);
    expect(execute(before, add(), () => "n1").outcome).toBe("error");
  });
  it("deletes an unconnected node immediately and clears dangling placement/focus", () => {
    const before = state(); before.graph.edges = [];
    before.graph.nodes[0].placement = { relation: "above", referenceNodeId: "n2" };
    const result = execute(freeze(before), del("n2"), ids());
    expect(result.outcome).toBe("committed");
    expect(result.state.graph.nodes.map(n => n.id)).toEqual(["n1", "n3", "n4"]);
    expect(result.state.graph.nodes[0].placement).toBeUndefined();
    expect(result.state.focusedNodeId).toBeNull();
    expect(result.state.recentNodeId).toBeNull();
  });
  it("connected deletion waits for confirm, preserving original graph and history", () => {
    const before = freeze(state()); const pending = execute(before, del("n2"), ids());
    expect(pending.outcome).toBe("confirmation"); expect(pending.message).toContain("2 connections");
    expect(pending.state.graph).toEqual(before.graph); expect(pending.state.history).toEqual(before.history);
    const result = execute(freeze(pending.state), { kind: "confirm" }, ids());
    expect(result.outcome).toBe("committed"); expect(result.state.graph.edges.map(e => e.id)).toEqual(["e3"]);
    expect(result.state.history.past).toHaveLength(1); expect(result.state.pending).toBeNull();
    expect(execute(result.state, { kind: "confirm" }, ids()).outcome).toBe("error");
  });
  it("cancel discards deletion without a history entry", () => {
    const before = state(); const pending = execute(before, del("n2"), ids());
    const result = execute(freeze(pending.state), { kind: "cancel" }, ids());
    expect(result.outcome).toBe("cancelled"); expect(result.state).toEqual(before);
  });
  it("focus changes cannot redirect a pending pronoun deletion", () => {
    const pending = execute(state(), { kind: "delete", target: { kind: "node", node: { kind: "focus" } } }, ids());
    const focused = execute(pending.state, { kind: "focus", node: id("n3") }, ids());
    const result = execute(focused.state, { kind: "confirm" }, ids());
    expect(result.state.graph.nodes.map(n => n.id)).toEqual(["n1", "n3", "n4"]);
  });
  it("rejects stale confirmation after a graph-version change", () => {
    const pending = execute(state(), del("n2"), ids()); pending.state.version += 1;
    const result = execute(freeze(pending.state), { kind: "confirm" }, ids());
    expect(result.outcome).toBe("error"); expect(result.state.graph).toEqual(state().graph); expect(result.state.pending).toBeNull();
  });
  it("new edits invalidate pending confirmation", () => {
    const pending = execute(state(), del("n2"), ids());
    const result = execute(pending.state, rename("n1", "Start"), ids());
    expect(result.state.pending).toBeNull(); expect(execute(result.state, { kind: "confirm" }, ids()).outcome).toBe("error");
  });
  it("deletes a uniquely identified edge without confirmation", () => {
    const result = execute(freeze(state()), { kind: "delete", target: { kind: "edge_id", id: "e2" } }, ids());
    expect(result.outcome).toBe("committed"); expect(result.state.graph.edges.map(e => e.id)).toEqual(["e1", "e3"]);
  });
  it("undo and redo restore exact snapshots with monotonic versions", () => {
    const before = state(); const changed = execute(before, rename("n2", "New"), ids()).state;
    const undone = execute(freeze(changed), { kind: "undo" }, ids()).state;
    expect(undone.graph).toEqual(before.graph); expect(undone.focusedNodeId).toBe(before.focusedNodeId); expect(undone.recentNodeId).toBe(before.recentNodeId);
    const redone = execute(freeze(undone), { kind: "redo" }, ids()).state;
    expect(redone.graph).toEqual(changed.graph); expect(redone.version).toBe(3);
  });
  it("new edit clears redo", () => {
    const changed = execute(state(), rename("n1", "Start"), ids()).state;
    const undone = execute(changed, { kind: "undo" }, ids()).state;
    const next = execute(undone, rename("n2", "Check"), ids()).state;
    expect(next.history.future).toEqual([]); expect(execute(next, { kind: "redo" }, ids()).outcome).toBe("error");
  });
  it("focus changes do not create history or clear redo", () => {
    const changed = execute(state(), rename("n1", "Start"), ids()).state;
    const undone = execute(changed, { kind: "undo" }, ids()).state;
    const focused = execute(undone, { kind: "focus", node: id("n3") }, ids());
    expect(focused.outcome).toBe("focused"); expect(focused.state.history).toEqual(undone.history); expect(focused.state.version).toBe(undone.version);
  });
  it.each(["undo", "redo"])("empty %s is a nonmutating error", kind => {
    const before = freeze(createEngineState()); const result = execute(before, { kind }, ids());
    expect(result.outcome).toBe("error"); expect(result.state).toEqual(before);
  });
});

describe("clarification and atomic commands", () => {
  function ambiguous() { const input = state(); input.graph.nodes[0].label = "Check"; input.graph.nodes[1].label = "Check"; return input; }
  it("duplicate labels ask for clarification and selection executes the stored command once", () => {
    const before = freeze(ambiguous()); const pending = execute(before, { kind: "rename", node: label("Check"), newLabel: "Chosen" }, ids());
    expect(pending.outcome).toBe("clarification"); expect(pending.state.graph).toEqual(before.graph);
    expect(pending.message).toContain("n1"); expect(pending.message).toContain("n2");
    const result = resolveClarification(freeze(pending.state), "n2", ids());
    expect(result.outcome).toBe("committed"); expect(result.state.graph.nodes[1].label).toBe("Chosen"); expect(result.state.graph.nodes[0].label).toBe("Check");
    expect(result.state.history.past).toHaveLength(1); expect(resolveClarification(result.state, "n2", ids()).outcome).toBe("error");
  });
  it("rejects a noncandidate and stale clarification", () => {
    const pending = execute(ambiguous(), { kind: "focus", node: label("Check") }, ids()).state;
    expect(resolveClarification(pending, "n4", ids()).state).toEqual(pending);
    const stale = { ...pending, version: pending.version + 1 };
    expect(resolveClarification(stale, "n1", ids()).outcome).toBe("error");
  });
  it("limits displayed choices to three while retaining all candidates", () => {
    const before = ambiguous(); before.graph.nodes.forEach(n => { n.label = "Check"; });
    const result = execute(before, { kind: "focus", node: label("Check") }, ids());
    expect(result.state.pending?.kind).toBe("clarification");
    expect(result.message).not.toContain("n4");
    expect(resolveClarification(result.state, "n4", ids()).state.focusedNodeId).toBe("n4");
  });
  it("ambiguous edge deletion waits for an exact edge choice", () => {
    const before = state(); before.graph.edges.push({ id: "e4", source: "n1", target: "n2" });
    const pending = execute(before, { kind: "delete", target: { kind: "edge", source: id("n1"), target: id("n2"), label: null } }, ids());
    expect(pending.outcome).toBe("clarification");
    const result = resolveClarification(pending.state, "e4", ids());
    expect(result.outcome).toBe("committed"); expect(result.state.graph.edges.map(e => e.id)).toEqual(["e1", "e2", "e3"]);
  });
  it("compound failure preserves graph and history", () => {
    const before = freeze(state()); const result = execute(before, { kind: "compound", commands: [add(), rename("missing", "Oops")] }, ids());
    expect(result.outcome).toBe("error"); expect(result.state).toEqual(before);
  });
  it("compound add and connect commit in one undo entry", () => {
    const before = state(); const result = execute(before, { kind: "compound", commands: [add("Next"), { kind: "connect", source: id("n4"), target: { kind: "recent" }, label: null }] }, ids());
    expect(result.outcome).toBe("committed"); expect(result.state.graph.edges.at(-1)?.target).toBe("generated-1");
    expect(result.state.history.past).toHaveLength(1); expect(execute(result.state, { kind: "undo" }, ids()).state.graph).toEqual(before.graph);
  });
  it("connected deletion inside a compound confirms the entire transaction", () => {
    const before = state(); const pending = execute(before, { kind: "compound", commands: [add("New"), del("n2")] }, ids());
    expect(pending.outcome).toBe("confirmation"); expect(pending.state.graph).toEqual(before.graph);
    const result = execute(pending.state, { kind: "confirm" }, ids());
    expect(result.state.graph.nodes.map(n => n.id)).toEqual(["n1", "n3", "n4", "generated-1"]); expect(result.state.history.past).toHaveLength(1);
  });
  it("invalid command after connected deletion causes rollback, not confirmation", () => {
    const before = state(); const result = execute(before, { kind: "compound", commands: [del("n2"), rename("missing", "Oops")] }, ids());
    expect(result.outcome).toBe("error"); expect(result.state).toEqual(before);
  });
  it("reuses provisional IDs across compound clarification and preserves the original context", () => {
    const before = ambiguous(); const pending = execute(before, { kind: "compound", commands: [add("New"), { kind: "connect", source: { kind: "recent" }, target: label("Check"), label: null }] }, ids());
    expect(pending.outcome).toBe("clarification"); expect(pending.state.graph).toEqual(before.graph);
    const focused = execute(pending.state, { kind: "focus", node: id("n4") }, ids()).state;
    const result = resolveClarification(focused, "n2", () => "fresh");
    expect(result.outcome).toBe("committed"); expect(result.state.graph.edges.at(-1)?.source).toBe("generated-1"); expect(result.state.history.past).toHaveLength(1);
  });
  it("revalidates prepared deletion before committing", () => {
    const pending = execute(state(), del("n2"), ids()).state;
    if (pending.pending?.kind !== "deletion") throw new Error("Expected deletion");
    pending.pending.prepared.graph.edges.push({ id: "bad", source: "missing", target: "n1" });
    const result = execute(pending, { kind: "confirm" }, ids());
    expect(result.outcome).toBe("error"); expect(result.state.graph).toEqual(state().graph);
  });
});

describe("read-only exploration", () => {
  it.each([
    { kind: "describe", scope: "chart" }, { kind: "describe", scope: "focus" },
    { kind: "inspect", node: null }, { kind: "inspect", node: id("n3") },
    { kind: "trace_path", start: id("n1"), end: id("n4") },
    { kind: "trace_path", start: id("n1"), end: null }, { kind: "validate" },
  ])("explores without changing graph, focus, history, redo, or version: %j", command => {
    const edited = execute(state(), rename("n1", "Start"), ids()).state;
    const before = freeze(execute(edited, { kind: "undo" }, ids()).state);
    const result = execute(before, command, () => { throw new Error("Exploration must not allocate IDs"); });
    expect(result.outcome).toBe("explored"); expect(result.state).toEqual(before); expect(result.message.length).toBeGreaterThan(0);
  });
  it.each([{ kind: "inspect", node: null }, { kind: "describe", scope: "focus" }])("asks for focus when none exists: %j", command => {
    const before = freeze(createEngineState()); const result = execute(before, command, ids());
    expect(result.outcome).toBe("error"); expect(result.message).toMatch(/focus/i); expect(result.state).toEqual(before);
  });
  it("missing trace references are errors, not successful empty paths", () => {
    const before = freeze(state()); const result = execute(before, { kind: "trace_path", start: id("missing"), end: null }, ids());
    expect(result.outcome).toBe("error"); expect(result.state).toEqual(before);
  });
  it("resumes an ambiguous inspect without adding history or moving focus", () => {
    const before = state(); before.graph.nodes[0].label = "Check"; before.graph.nodes[1].label = "Check";
    const pending = execute(before, { kind: "inspect", node: label("Check") }, ids());
    expect(pending.outcome).toBe("clarification");
    const result = resolveClarification(pending.state, "n1", ids());
    expect(result.outcome).toBe("explored"); expect(result.message).toContain("start, n1"); expect(result.state).toEqual(before);
  });
  it("keeps the original trace start pinned while clarifying the target", () => {
    const before = state(); before.graph.nodes[2].label = "Check"; before.graph.nodes[3].label = "Check";
    const pending = execute(before, { kind: "trace_path", start: { kind: "focus" }, end: label("Check") }, ids());
    expect(pending.outcome).toBe("clarification");
    const changedFocus = execute(pending.state, { kind: "focus", node: id("n1") }, ids()).state;
    const result = resolveClarification(changedFocus, "n4", ids());
    expect(result.outcome).toBe("explored"); expect(result.message).toMatch(/^Path: "Validate card"/);
    expect(result.state.focusedNodeId).toBe("n1"); expect(result.state.history).toEqual(before.history);
  });
  it("inspection preserves an outstanding deletion confirmation", () => {
    const pending = freeze(execute(state(), del("n2"), ids()).state);
    const inspected = execute(pending, { kind: "inspect", node: id("n2") }, ids());
    expect(inspected.outcome).toBe("explored"); expect(inspected.state).toEqual(pending);
    expect(execute(inspected.state, { kind: "confirm" }, ids()).outcome).toBe("committed");
  });
  it("reports validation findings instead of treating an incomplete chart as corrupt", () => {
    const result = execute(createEngineState(), { kind: "validate" }, ids());
    expect(result.outcome).toBe("explored"); expect(result.message).toContain("No start node."); expect(result.message).toContain("No end node.");
  });
});
