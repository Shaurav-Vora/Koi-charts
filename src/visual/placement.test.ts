import { describe, expect, it } from "vitest";
import { placementAt } from "./placement";
const frame = { nodes: [{ id: "a", x: 0, y: 0, width: 100, height: 100 }], edges: [] };
describe("pointer placement", () => {
  it("places dropped shapes on the nearest side of an existing node", () => {
    expect(placementAt(frame, { x: 250, y: 50 })).toEqual({ relation: "right_of", reference: { kind: "id", value: "a" } });
    expect(placementAt(frame, { x: 50, y: -100 })?.relation).toBe("above");
  });
  it("never creates a self-reference when dragging a node", () => {
    expect(placementAt(frame, { x: 250, y: 50 }, "a")).toBeNull();
  });
});
