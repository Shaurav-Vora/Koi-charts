// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEngineState } from "./execute";
import { resolveNode } from "./resolve";
import { graphFixture } from "../test/fixtures";

function state() {
  return { ...createEngineState(), graph: graphFixture(), focusedNodeId: "n2", recentNodeId: "n3" };
}

describe("node references", () => {
  it("resolves an existing opaque ID, but never invents one", () => {
    expect(resolveNode(state(), { kind: "id", value: "n1" })).toEqual({ kind: "resolved", id: "n1" });
    expect(resolveNode(state(), { kind: "id", value: "missing" })).toEqual({ kind: "missing" });
  });
  it("uses case-insensitive exact labels", () => {
    expect(resolveNode(state(), { kind: "label", value: "VALIDATE CARD" })).toEqual({ kind: "resolved", id: "n2" });
  });
  it("never picks one of duplicate exact labels", () => {
    const input = state(); input.graph.nodes[1].label = "Begin";
    expect(resolveNode(input, { kind: "label", value: "begin" })).toEqual({ kind: "ambiguous", ids: ["n1", "n2"] });
  });
  // Speech surrounds a name with words that are not part of it. Everyday phrasings that
  // previously resolved to nothing: "delete the Validate card node", "the node called ...".
  it.each(["Validate card node", "the Validate card node", "node called Validate card",
    "the shape named Validate card", "process Validate card", "Validate card shape"])(
    "reads past the words around a name: %s", value => {
      expect(resolveNode(state(), { kind: "label", value })).toEqual({ kind: "resolved", id: "n2" });
    });
  it("prefers a shape that really is called that, over the relaxed reading", () => {
    const input = state(); input.graph.nodes[3].label = "Validate card node";
    expect(resolveNode(input, { kind: "label", value: "Validate card node" })).toEqual({ kind: "resolved", id: "n4" });
  });
  it("still refuses a name that matches nothing once the surrounding words are gone", () => {
    expect(resolveNode(state(), { kind: "label", value: "the missing node" })).toEqual({ kind: "missing" });
    // A bare shape word names no shape at all: it must not be stripped down to nothing.
    expect(resolveNode(state(), { kind: "label", value: "node" })).toEqual({ kind: "missing" });
  });
  it.each(["this", "it", "this node"])("resolves pronoun %s to focus", value => {
    expect(resolveNode(state(), { kind: "label", value })).toEqual({ kind: "resolved", id: "n2" });
  });
  it("prefers an exact label over a pronoun", () => {
    const input = state(); input.graph.nodes[0].label = "this";
    expect(resolveNode(input, { kind: "label", value: "this" })).toEqual({ kind: "resolved", id: "n1" });
  });
  it("requires valid focused and recent IDs", () => {
    const input = { ...state(), focusedNodeId: "missing", recentNodeId: null };
    expect(resolveNode(input, { kind: "focus" })).toEqual({ kind: "missing" });
    expect(resolveNode(input, { kind: "recent" })).toEqual({ kind: "missing" });
  });
  it("normalizes punctuation, Unicode, and repeated spaces", () => {
    expect(resolveNode(state(), { kind: "label", value: "  Validate--card! " })).toEqual({ kind: "resolved", id: "n2" });
  });
  it("accepts a unique high-confidence typo", () => {
    expect(resolveNode(state(), { kind: "label", value: "Validate cart" })).toEqual({ kind: "resolved", id: "n2" });
  });
  it("asks about close fuzzy matches", () => {
    const input = state(); input.graph.nodes[0].label = "Validate cards";
    expect(resolveNode(input, { kind: "label", value: "Validate cart" }).kind).toBe("ambiguous");
  });
  it("does not silently choose a normalized duplicate", () => {
    const input = state(); input.graph.nodes[0].label = "Validate-card";
    expect(resolveNode(input, { kind: "label", value: "validate  card" })).toEqual({ kind: "ambiguous", ids: ["n1", "n2"] });
  });
  it("rejects unrelated and empty normalized labels instead of falling back to recent", () => {
    expect(resolveNode(state(), { kind: "label", value: "Other" })).toEqual({ kind: "missing" });
    expect(resolveNode(state(), { kind: "label", value: "!!!" })).toEqual({ kind: "missing" });
  });
  it("uses recent only for explicit references", () => {
    expect(resolveNode(state(), { kind: "label", value: "the node I just added" })).toEqual({ kind: "resolved", id: "n3" });
    expect(resolveNode(state(), { kind: "recent" })).toEqual({ kind: "resolved", id: "n3" });
  });
});
