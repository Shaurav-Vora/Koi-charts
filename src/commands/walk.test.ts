// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEngineState } from "./execute";
import { execute } from "./execute";
import { parseControl } from "./fast-path";
import { graphFixture } from "../test/fixtures";
import type { EngineState } from "../graph/types";

// The fixture is a chain: Begin -> Validate card -> Payment approved -("yes")-> Show receipt.
const at = (focusedNodeId: string | null, overrides: Partial<EngineState> = {}): EngineState =>
  ({ ...createEngineState(), graph: graphFixture(), focusedNodeId, ...overrides });
const walk = (state: EngineState, direction: string, branch: string | null = null) =>
  execute(state, { kind: "walk", direction, branch }, () => "new");

describe("walking the cursor", () => {
 it("moves forward along the only outgoing connection", () => {
  const result = walk(at("n1"), "next");
  expect(result.outcome).toBe("focused");
  expect(result.state.focusedNodeId).toBe("n2");
  expect(result.message).toContain("Validate card");
 });
 it("moves back along the only incoming connection", () => {
  const result = walk(at("n2"), "back");
  expect(result.state.focusedNodeId).toBe("n1");
 });
 it("reports where the cursor stands without moving it", () => {
  const result = walk(at("n2"), "stay");
  expect(result.outcome).toBe("explored");
  expect(result.state.focusedNodeId).toBe("n2");
  expect(result.message).toContain("Validate card");
 });
 // A blind user cannot see which way a branch leads, so the choices are spoken rather
 // than guessed at, and the cursor stays put until one is named.
 it("lists the choices at a branch instead of picking one", () => {
  const graph = graphFixture();
  graph.edges.push({ id: "e4", source: "n3", target: "n2", label: "no" });
  const result = walk(at("n3", { graph }), "next");
  expect(result.outcome).toBe("explored");
  expect(result.state.focusedNodeId).toBe("n3");
  expect(result.message).toContain("yes");
  expect(result.message).toContain("no");
 });
 it("takes a named branch by its connection label", () => {
  const graph = graphFixture();
  graph.edges.push({ id: "e4", source: "n3", target: "n2", label: "no" });
  expect(walk(at("n3", { graph }), "next", "no").state.focusedNodeId).toBe("n2");
  expect(walk(at("n3", { graph }), "next", "YES").state.focusedNodeId).toBe("n4");
 });
 it("takes a branch named by its destination when no connection carries that label", () => {
  const graph = graphFixture();
  graph.edges.push({ id: "e4", source: "n3", target: "n2", label: "no" });
  expect(walk(at("n3", { graph }), "next", "Validate card").state.focusedNodeId).toBe("n2");
 });
 it("rejects a branch that does not exist and says what is available", () => {
  const graph = graphFixture();
  graph.edges.push({ id: "e4", source: "n3", target: "n2", label: "no" });
  const result = walk(at("n3", { graph }), "next", "maybe");
  expect(result.outcome).toBe("error");
  expect(result.state.focusedNodeId).toBe("n3");
  expect(result.message).toContain("yes");
 });
 it("stops at the end of a path without moving or failing", () => {
  const result = walk(at("n4"), "next");
  expect(result.outcome).toBe("explored");
  expect(result.state.focusedNodeId).toBe("n4");
  expect(result.message).toMatch(/no connections lead onward|end of/i);
 });
 it("jumps to a start node from anywhere, including no focus at all", () => {
  expect(walk(at(null), "first").state.focusedNodeId).toBe("n1");
  expect(walk(at("n4"), "first").state.focusedNodeId).toBe("n1");
 });
 it("jumps to an end node", () => {
  expect(walk(at("n1"), "last").state.focusedNodeId).toBe("n4");
 });
 it("asks for a starting point rather than guessing when nothing is focused", () => {
  const result = walk(at(null), "next");
  expect(result.outcome).toBe("error");
  expect(result.message).toMatch(/go to start/i);
 });
 it("says the chart is empty rather than reporting a missing start node", () => {
  const result = walk(createEngineState(), "first");
  expect(result.outcome).toBe("error");
  expect(result.message).toContain("empty");
 });
 it("falls back to the first node when the chart has no start node", () => {
  const graph = graphFixture();
  graph.nodes[0].type = "process";
  const result = walk(at(null, { graph }), "first");
  expect(result.state.focusedNodeId).toBe("n1");
  expect(result.message).toContain("no start node");
 });
 // Announcing the ways out is the whole point: it replaces the glance a sighted user takes.
 it("announces the ways onward and back from wherever it lands", () => {
  const message = walk(at("n1"), "next").message;
  expect(message).toContain("1 way onward");
  expect(message).toContain("1 way back");
 });
 it("counts a node with nothing attached as isolated", () => {
  const graph = graphFixture();
  graph.nodes.push({ id: "n5", type: "process", label: "Orphan" });
  expect(walk(at("n5", { graph }), "stay").message).toContain("Nothing attached");
 });
 it("leaves the chart and its history untouched", () => {
  const before = at("n1");
  const result = walk(before, "next");
  expect(result.state.graph).toEqual(before.graph);
  expect(result.state.history).toEqual(before.history);
  expect(result.state.version).toBe(before.version);
 });
 // Stepping is the most repeated action in a walk, so it never costs a provider request.
 it.each([
  ["next", { kind: "walk", direction: "next", branch: null }],
  ["go forward", { kind: "walk", direction: "next", branch: null }],
  ["Back", { kind: "walk", direction: "back", branch: null }],
  ["where am I?", { kind: "walk", direction: "stay", branch: null }],
  ["go to start", { kind: "walk", direction: "first", branch: null }],
  ["go to the end", { kind: "walk", direction: "last", branch: null }],
  ["take yes", { kind: "walk", direction: "next", branch: "yes" }],
  ['follow the branch "no thanks".', { kind: "walk", direction: "next", branch: "no thanks" }],
 ])("recognises %s locally, without a provider", (phrase, command) => {
  expect(parseControl(phrase)).toEqual(command);
 });
 it("reads a jump to the start as a jump, not as a branch called 'to start'", () => {
  expect(parseControl("go to start")).toEqual({ kind: "walk", direction: "first", branch: null });
 });
 it("does not move the cursor onto a node that a self-connection loops back to", () => {
  const graph = graphFixture();
  graph.edges.push({ id: "e4", source: "n2", target: "n2", label: "retry" });
  const result = walk(at("n2", { graph }), "next");
  expect(result.outcome).toBe("explored");
  expect(result.message).toContain("retry");
 });
});
