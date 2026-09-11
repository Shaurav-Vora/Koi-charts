"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Background, BaseEdge, ConnectionMode, EdgeText, MarkerType, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import { nodeTypes as semanticTypes } from "../graph/types";
import { routeEdges } from "./layout";
import type { FlowGraph } from "../graph/types";
import type { GraphCommand } from "../commands/schema";
import FlowNode, { type CanvasNode } from "./FlowNode";
import ArrowInspector from "./ArrowInspector";
import CanvasControls from "./CanvasControls";
import type { LayoutFrame } from "./layout";
import "@xyflow/react/dist/style.css";

type RoutedEdge = Edge<{ points: { x: number; y: number }[] }, "routed">;
function FlowEdge({ id, data, label, markerEnd, selected }: EdgeProps<RoutedEdge>) {
  if (!data) return null;
  const path = data.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const a = data.points[Math.floor((data.points.length - 1) / 2)], b = data.points[Math.ceil((data.points.length - 1) / 2)];
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={{ stroke: selected ? "#315ac8" : "#536b99", strokeWidth: selected ? 3 : 1.7 }} />{label && <EdgeText x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} label={label} labelStyle={{ fill: selected ? "#244ea9" : "#1c2c49", fontSize: 12, fontWeight: selected ? 700 : 500 }} labelShowBg labelBgStyle={{ fill: selected ? "#e9efff" : "white" }} labelBgPadding={[7, 4]} />}</>;
}
const nodeTypes = { flowNode: FlowNode }, edgeTypes = { routed: FlowEdge };
function FitChart({ layout }: { layout: LayoutFrame }) {
  const { fitView } = useReactFlow(); const initialized = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => { if (initialized && layout.nodes.length > 0 && !fitted.current) { fitted.current = true; void fitView({ padding: 0.25, maxZoom: 1, duration: 0 }); } }, [fitView, initialized, layout.nodes.length]);
  return null;
}
export interface VisualCanvasProps {
  graph: FlowGraph;
  layout: LayoutFrame;
  focusedNodeId: string | null;
  onCommand: (command: GraphCommand) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canWalk?: boolean;
  canStep?: boolean;
  onWalk?: (direction: "first" | "back" | "next" | "stay") => void;
  canExample?: boolean;
  onExample?: () => void;
  onDescribe?: () => void;
  onInspect?: () => void;
  onValidate?: () => void;
}

function Canvas({
  graph,
  layout,
  focusedNodeId,
  onCommand,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canWalk,
  canStep,
  onWalk,
  canExample,
  onExample,
  onDescribe,
  onInspect,
  onValidate,
}: VisualCanvasProps) {
  const { screenToFlowPosition, zoomIn, zoomOut, fitView, setCenter, getZoom } = useReactFlow();
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const selectedEdge = graph.edges.find(edge => edge.id === selectedEdgeId);
  const focusedBox = layout.nodes.find(box => box.id === focusedNodeId);
  // Never zoom out to centre: an author who has zoomed in to read a label keeps that reading size.
  const centerOnFocus = () => { if (focusedBox) void setCenter(focusedBox.x + focusedBox.width / 2, focusedBox.y + focusedBox.height / 2, { zoom: Math.max(getZoom(), 1), duration: 220 }); };
  const nodes: CanvasNode[] = useMemo(() => graph.nodes.map(node => {
    const box = layout.nodes.find(item => item.id === node.id)!;
    return { id: node.id, type: "flowNode", selectable: false, position: { x: box.x, y: box.y }, width: box.width, height: box.height, measured: { width: box.width, height: box.height },
      style: { width: box.width, height: box.height }, data: { label: node.label, nodeType: node.type, focused: node.id === focusedNodeId,
        onRename: (newLabel: string) => onCommand({ kind: "rename", node: { kind: "id", value: node.id }, newLabel }),
        onFocus: () => { setSelectedEdgeId(null); onCommand({ kind: "focus", node: { kind: "id", value: node.id } }); } } };
  }), [graph, layout, focusedNodeId, onCommand]);
  const liveLayout = useMemo(() => drag ? routeEdges(graph, layout.nodes.map(node => node.id === drag.id ? { ...node, x: drag.x, y: drag.y } : node)) : layout.edges, [drag, graph, layout]);
  const edges: RoutedEdge[] = useMemo(() => graph.edges.map(edge => ({ ...edge, type: "routed", selected: edge.id === selectedEdgeId, ariaLabel: `Edit arrow from ${graph.nodes.find(node => node.id === edge.source)?.label} to ${graph.nodes.find(node => node.id === edge.target)?.label}`, data: { points: liveLayout.find(item => item.id === edge.id)!.points }, markerEnd: { type: MarkerType.ArrowClosed, color: edge.id === selectedEdgeId ? "#315ac8" : "#536b99" } })), [graph, liveLayout, selectedEdgeId]);
  return <div className="canvas-area" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={event => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/koi-node");
    if (!semanticTypes.includes(type as typeof semanticTypes[number])) return;
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onCommand({ kind: "compound", commands: [{ kind: "add_node", type: type as typeof semanticTypes[number], label: type[0].toUpperCase() + type.slice(1), placement: null }, { kind: "move_to", node: { kind: "recent" }, position: { x: point.x - (type === "decision" ? 115 : 95), y: point.y - (type === "decision" ? 75 : 43) } }] });
  }}><ReactFlow<CanvasNode, RoutedEdge> nodes={nodes.map(node => drag?.id === node.id ? { ...node, position: { x: drag.x, y: drag.y } } : node)} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
    connectionMode={ConnectionMode.Loose} connectionRadius={32}
    zoomOnDoubleClick={false} onPaneClick={() => { setSelectedEdgeId(null); onCommand({ kind: "clear_focus" }); }}
    onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); onCommand({ kind: "clear_focus" }); }}
    onEdgesChange={changes => { for (const change of changes) if (change.type === "select") { if (change.selected) { setSelectedEdgeId(change.id); onCommand({kind:"clear_focus"}); } else setSelectedEdgeId(current => current === change.id ? null : current); } }}
    isValidConnection={connection => connection.source !== connection.target}
    nodesDraggable
    onNodesChange={changes => { for (const change of changes) { if (change.type === "position" && change.position && change.dragging) setDrag({ id: change.id, ...change.position }); } }}
    onNodeDragStop={(_, node) => {
      onCommand({ kind: "move_to", node: { kind: "id", value: node.id }, position: node.position });
      setDrag(null);
    }} nodesFocusable={false} edgesFocusable elementsSelectable edgesReconnectable={false} deleteKeyCode={null}
    onConnect={({ source, target }) => onCommand({ kind: "connect", source: { kind: "id", value: source }, target: { kind: "id", value: target }, label: null })}
    ariaLabelConfig={{ "node.a11yDescription.default": "Select a node to focus it. Use the editing form for keyboard movement and deletion.", "edge.a11yDescription.default": "Connections are available in the chart outline." }}
    fitView fitViewOptions={{ maxZoom: 1, padding: 0.25 }} minZoom={0.1} maxZoom={2}>
    <Background gap={20} color="#d4ddea" /><FitChart layout={layout} />
  </ReactFlow>
  <CanvasControls canFit={layout.nodes.length > 0} canCenter={!!focusedBox}
    onZoomIn={() => void zoomIn({ duration: 160 })} onZoomOut={() => void zoomOut({ duration: 160 })}
    onFit={() => void fitView({ padding: 0.25, maxZoom: 1, duration: 220 })} onCenter={centerOnFocus}
    canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo} />
  {onWalk && onDescribe && onInspect && onValidate && (
    <div className="canvas-dock nodrag nopan" role="toolbar" aria-label="Chart navigation and inspection">
      <div className="canvas-control-group walk-controls" role="group" aria-label="Walk the chart">
        <button type="button" disabled={!canWalk} onClick={() => onWalk("first")} title="Go to start">Go to start</button>
        <button type="button" disabled={!canStep} onClick={() => onWalk("back")} title="Back to previous node">Back</button>
        <button type="button" disabled={!canStep} onClick={() => onWalk("next")} title="Next connected node">Next</button>
        <button type="button" disabled={!canStep} onClick={() => onWalk("stay")} title="Where am I">Where am I</button>
      </div>
      <div className="canvas-control-divider" aria-hidden="true" />
      <div className="canvas-control-group query-controls" role="group" aria-label="Chart actions">
        {canExample && onExample && <button type="button" onClick={onExample} title="Load large example">Load large example</button>}
        <button type="button" onClick={onDescribe} title="Describe chart">Describe chart</button>
        <button type="button" disabled={!canStep} onClick={onInspect} title="Inspect focus">Inspect focus</button>
        <button type="button" onClick={onValidate} title="Validate chart">Validate chart</button>
      </div>
    </div>
  )}
  {selectedEdge && <ArrowInspector key={`${selectedEdge.id}-${selectedEdge.label ?? ""}`} edge={selectedEdge}
    source={graph.nodes.find(node => node.id === selectedEdge.source)!} target={graph.nodes.find(node => node.id === selectedEdge.target)!}
    onCommand={onCommand} onClose={() => setSelectedEdgeId(null)} />}</div>;
}

export default function VisualCanvas(props: VisualCanvasProps) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
