"use client";
import { useEffect, useMemo, useState } from "react";
import { Background, BaseEdge, Controls, EdgeText, MarkerType, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import { nodeTypes as semanticTypes } from "../graph/types";
import { placementAt } from "./placement";
import type { FlowGraph } from "../graph/types";
import type { GraphCommand } from "../commands/schema";
import FlowNode, { type CanvasNode } from "./FlowNode";
import type { LayoutFrame } from "./layout";
import "@xyflow/react/dist/style.css";

type RoutedEdge = Edge<{ points: { x: number; y: number }[] }, "routed">;
function FlowEdge({ id, data, label, markerEnd }: EdgeProps<RoutedEdge>) {
  if (!data) return null;
  const path = data.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const a = data.points[Math.floor((data.points.length - 1) / 2)], b = data.points[Math.ceil((data.points.length - 1) / 2)];
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: "#536b99", strokeWidth: 1.7 }} />{label && <EdgeText x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} label={label} labelStyle={{ fill: "#1c2c49", fontSize: 12 }} labelShowBg labelBgStyle={{ fill: "white" }} labelBgPadding={[5, 3]} />}</>;
}
const nodeTypes = { flowNode: FlowNode }, edgeTypes = { routed: FlowEdge };
function FitChart({ layout }: { layout: LayoutFrame }) {
  const { fitView } = useReactFlow(); const initialized = useNodesInitialized();
  useEffect(() => { if (initialized) void fitView({ padding: 0.25, maxZoom: 1, duration: 0 }); }, [fitView, initialized, layout]);
  return null;
}
function Canvas({ graph, layout, focusedNodeId, onCommand }: { graph: FlowGraph; layout: LayoutFrame; focusedNodeId: string | null; onCommand: (command: GraphCommand) => void }) {
  const { screenToFlowPosition } = useReactFlow();
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const nodes: CanvasNode[] = useMemo(() => graph.nodes.map(node => {
    const box = layout.nodes.find(item => item.id === node.id)!;
    return { id: node.id, type: "flowNode", position: { x: box.x, y: box.y }, width: box.width, height: box.height, measured: { width: box.width, height: box.height },
      style: { width: box.width, height: box.height }, data: { label: node.label, nodeType: node.type, focused: node.id === focusedNodeId,
        onFocus: () => onCommand({ kind: "focus", node: { kind: "id", value: node.id } }) } };
  }), [graph, layout, focusedNodeId, onCommand]);
  const edges: RoutedEdge[] = useMemo(() => graph.edges.map(edge => ({ ...edge, type: "routed", data: { points: layout.edges.find(item => item.id === edge.id)!.points }, markerEnd: { type: MarkerType.ArrowClosed, color: "#536b99" } })), [graph, layout]);
  return <div className="canvas-area" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={event => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/koi-node");
    if (!semanticTypes.includes(type as typeof semanticTypes[number])) return;
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onCommand({ kind: "add_node", type: type as typeof semanticTypes[number], label: type[0].toUpperCase() + type.slice(1), placement: placementAt(layout, point) });
  }}><ReactFlow<CanvasNode, RoutedEdge> nodes={nodes.map(node => drag?.id === node.id ? { ...node, position: { x: drag.x, y: drag.y } } : node)} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
    nodesDraggable
    onNodesChange={changes => { for (const change of changes) { if (change.type === "position" && change.position && change.dragging) setDrag({ id: change.id, ...change.position }); } }}
    onNodeDragStop={(_, node) => {
      const placement = placementAt(layout, { x: node.position.x + (node.width ?? 190) / 2, y: node.position.y + (node.height ?? 86) / 2 }, node.id);
      setDrag(null);
      if (placement) onCommand({ kind: "move", node: { kind: "id", value: node.id }, placement });
    }} nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} edgesReconnectable={false} deleteKeyCode={null}
    onConnect={({ source, target }) => onCommand({ kind: "connect", source: { kind: "id", value: source }, target: { kind: "id", value: target }, label: null })}
    ariaLabelConfig={{ "node.a11yDescription.default": "Select a node to focus it. Use the editing form for keyboard movement and deletion.", "edge.a11yDescription.default": "Connections are available in the chart outline." }}
    fitView fitViewOptions={{ maxZoom: 1, padding: 0.25 }} minZoom={0.1} maxZoom={2}>
    <Background gap={20} color="#d4ddea" /><Controls showInteractive={false} /><FitChart layout={layout} />
  </ReactFlow></div>;
}

export default function VisualCanvas(props: Parameters<typeof Canvas>[0]) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
