import type { LayoutFrame } from "./layout";
import type { PlacementRelation } from "../graph/types";
export function placementAt(layout: LayoutFrame, point: { x: number; y: number }, excludeId?: string) {
  const boxes = layout.nodes.filter(node => node.id !== excludeId).sort((a, b) => {
    const distance = (n: typeof a) => Math.hypot(point.x - n.x - n.width / 2, point.y - n.y - n.height / 2);
    return distance(a) - distance(b) || a.id.localeCompare(b.id);
  });
  const closest = boxes[0];
  if (!closest) return null;
  const dx = point.x - closest.x - closest.width / 2, dy = point.y - closest.y - closest.height / 2;
  const relation: PlacementRelation = Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left_of" : "right_of" : dy < 0 ? "above" : "below";
  return { relation, reference: { kind: "id" as const, value: closest.id } };
}
