import type { FlowGraph } from "../graph/types";
import type { LayoutFrame } from "../visual/layout";
import type { TactileMode } from "./types";
export function selectViewport(graph: FlowGraph, layout: LayoutFrame, focus: string | null, mode: TactileMode) {
  const focusedNodeId = graph.nodes.some(n => n.id === focus) ? focus : [...graph.nodes].sort((a,b) => a.id.localeCompare(b.id))[0]?.id ?? null;
  const ids = new Set(mode === "overview" ? graph.nodes.map(n => n.id) : focusedNodeId ? [focusedNodeId] : []);
  if (mode === "focus") for (const e of graph.edges) { if (e.source === focusedNodeId) ids.add(e.target); if (e.target === focusedNodeId) ids.add(e.source); }
  const edges = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  return { focusedNodeId, nodes: layout.nodes.filter(n => ids.has(n.id)), edges: layout.edges.filter(e => edges.some(item => item.id === e.id)) };
}
export function fitViewport(view: ReturnType<typeof selectViewport>) {
  const points = [...view.nodes.flatMap(n => [{x:n.x,y:n.y},{x:n.x+n.width,y:n.y+n.height}]), ...view.edges.flatMap(e => e.points)];
  if (!points.length) return { scale: 1, x: 0, y: 0 };
  const left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y));
  const width = Math.max(...points.map(p => p.x)) - left, height = Math.max(...points.map(p => p.y)) - top;
  const scale = Math.min(110 / Math.max(1,width),70 / Math.max(1,height));
  return { scale, x: (120-width*scale)/2-left*scale, y: (80-height*scale)/2-top*scale };
}
export function needsFocus(graph: FlowGraph, layout: LayoutFrame) {
  const view = selectViewport(graph,layout,null,"overview"), {scale} = fitViewport(view);
  return view.nodes.some(n => n.width*scale < 8 || n.height*scale < 6);
}
