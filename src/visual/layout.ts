import { graphlib, layout } from "@dagrejs/dagre";
import { assertGraph } from "../graph/invariants";
import type { FlowGraph } from "../graph/types";
export type LayoutNode = { id: string; x: number; y: number; width: number; height: number };
export type LayoutFrame = { nodes: LayoutNode[]; edges: { id: string; points: { x: number; y: number }[] }[] };
const compare = (a: { id: string }, b: { id: string }) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
const gap = 64;

export function layoutGraph(graph: FlowGraph): LayoutFrame {
  assertGraph(graph);
  if (!graph.nodes.length) return { nodes: [], edges: [] };
  const ordered = [...graph.nodes].sort(compare);
  const dag = new graphlib.Graph({ multigraph: true }).setGraph({ rankdir: "TB", nodesep: 64, ranksep: 88 }).setDefaultEdgeLabel(() => ({}));
  ordered.forEach(node => dag.setNode(node.id, { width: node.type === "decision" ? 230 : 190, height: node.type === "decision" ? 150 : 86 }));
  [...graph.edges].sort(compare).forEach(edge => dag.setEdge(edge.source, edge.target, {}, edge.id));
  layout(dag);
  const positions = new Map<string, LayoutNode>(ordered.map(node => {
    const box = dag.node(node.id);
    return [node.id, { id: node.id, x: box.x - box.width / 2, y: box.y - box.height / 2, width: box.width, height: box.height }];
  }));
  const placed = new Set<string>(), visiting = new Set<string>();
  const place = (id: string) => {
    if (placed.has(id) || visiting.has(id)) return;
    visiting.add(id);
    const node = ordered.find(item => item.id === id)!;
    const box = positions.get(id)!;
    const relation = node.placement?.relation;
    if (node.placement) {
      // Cyclic hints use the stable existing position when a dependency is already being visited.
      place(node.placement.referenceNodeId);
      const ref = positions.get(node.placement.referenceNodeId)!;
      box.x = ref.x + (ref.width - box.width) / 2;
      box.y = ref.y + (ref.height - box.height) / 2;
      if (relation === "before" || relation === "above") box.y = ref.y - box.height - gap;
      if (relation === "after" || relation === "below") box.y = ref.y + ref.height + gap;
      if (relation === "left_of") box.x = ref.x - box.width - gap;
      if (relation === "right_of") box.x = ref.x + ref.width + gap;
    }
    const overlap = (other: LayoutNode) => box.x < other.x + other.width + 24 && box.x + box.width + 24 > other.x && box.y < other.y + other.height + 24 && box.y + box.height + 24 > other.y;
    while ([...placed].some(other => overlap(positions.get(other)!))) {
      if (relation === "above" || relation === "before") box.y -= box.height + gap;
      else if (relation === "below" || relation === "after") box.y += box.height + gap;
      else if (relation === "left_of") box.x -= box.width + gap;
      else box.x += box.width + gap;
    }
    visiting.delete(id); placed.add(id);
  };
  ordered.forEach(node => place(node.id));
  const nodes = [...positions.values()];
  const dx = 32 - Math.min(...nodes.map(n => n.x)), dy = 32 - Math.min(...nodes.map(n => n.y));
  nodes.forEach(node => { node.x += dx; node.y += dy; });
  const edges = [...graph.edges].sort(compare).map(edge => {
    const source = positions.get(edge.source)!, target = positions.get(edge.target)!;
    const from = { x: source.x + source.width / 2, y: source.y + source.height };
    const to = { x: target.x + target.width / 2, y: target.y };
    const midY = (from.y + to.y) / 2;
    const outsideX = Math.max(source.x + source.width, target.x + target.width) + 36;
    const points = to.y > from.y + 32
      ? [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to]
      : [from, { x: from.x, y: from.y + 24 }, { x: outsideX, y: from.y + 24 }, { x: outsideX, y: to.y - 24 }, { x: to.x, y: to.y - 24 }, to];
    return { id: edge.id, points };
  });
  return { nodes, edges };
}
