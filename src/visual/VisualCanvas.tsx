"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { Background, BaseEdge, ConnectionMode, EdgeText, MarkerType, ReactFlow, ReactFlowProvider, SelectionMode, useNodesInitialized, useReactFlow, type Edge, type EdgeProps } from "@xyflow/react";
import { nodeTypes as semanticTypes } from "../graph/types";
import { routeEdges } from "./layout";
import type { FlowGraph } from "../graph/types";
import type { GraphCommand } from "../commands/schema";
import FlowNode, { type CanvasNode } from "./FlowNode";
import ArrowInspector from "./ArrowInspector";
import CanvasControls from "./CanvasControls";
import { nodeDimensions, type LayoutFrame } from "./layout";
import type { PlaybackRouteStep } from "../playback/types";
import "@xyflow/react/dist/style.css";

type PlaybackMark = "visited" | "current";
type RoutedEdge = Edge<{ points: { x: number; y: number }[]; playbackState?: PlaybackMark; accessibleName: string }, "routed">;
function FlowEdge({ id, data, label, markerEnd, selected }: EdgeProps<RoutedEdge>) {
  if (!data) return null;
  const path = data.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const a = data.points[Math.floor((data.points.length - 1) / 2)], b = data.points[Math.ceil((data.points.length - 1) / 2)];
  const stroke = selected ? "#244ea9" : data.playbackState === "current" ? "#c25f0a" : data.playbackState === "visited" ? "#315ac8" : "#536b99";
  const strokeWidth = selected ? 4 : data.playbackState === "current" ? 3.2 : data.playbackState === "visited" ? 2.6 : 1.7;
  return <><BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24}
    className={`playback-edge${data.playbackState ? ` is-${data.playbackState}` : ""}`}
    data-playback-state={data.playbackState} aria-label={data.accessibleName}
    style={{ stroke, strokeWidth, strokeDasharray: !selected && data.playbackState === "current" ? "8 5" : undefined }} />
    {label && <EdgeText x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} label={label} labelStyle={{ fill: selected ? "#244ea9" : "#1c2c49", fontSize: 12, fontWeight: selected ? 700 : 500 }} labelShowBg labelBgStyle={{ fill: selected ? "#e9efff" : "white" }} labelBgPadding={[7, 4]} />}</>;
}
const nodeTypes = { flowNode: FlowNode }, edgeTypes = { routed: FlowEdge };
const noControlledNodeSelection: string[] = [];
const readableFitMinZoom = 0.8;
function FitChart({ layout }: { layout: LayoutFrame }) {
  const { fitView } = useReactFlow(); const initialized = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => { if (initialized && layout.nodes.length > 0 && !fitted.current) { fitted.current = true; void fitView({ padding: 0.25, minZoom: readableFitMinZoom, maxZoom: 1, duration: 0 }); } }, [fitView, initialized, layout.nodes.length]);
  return null;
}
export interface VisualCanvasProps {
  graph: FlowGraph;
  layout: LayoutFrame;
  focusedNodeId: string | null;
  displayIds?: Record<string, string>;
  onCommand: (command: GraphCommand) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canClear?: boolean;
  onClear?: () => void;
  canWalk?: boolean;
  canStep?: boolean;
  onWalk?: (direction: "first" | "back" | "next" | "stay") => void;
  canExample?: boolean;
  onExample?: () => void;
  onDescribe?: () => void;
  onInspect?: () => void;
  playbackRoute?: PlaybackRouteStep[];
  centerRequest?: { key: string; nodeId: string } | null;
  inspectEdgeRequest?: { key: string; edgeId: string } | null;
  selectionResetKey?: number;
  onInspectEdgeRequestHandled?: () => void;
  onInspectEdge?: (edgeId: string) => void;
  selectedNodeIds?: string[];
  onSelectedNodeIdsChange?: (nodeIds: string[]) => void;
  onSelectionComplete?: (nodeIds: string[]) => void;
  onDeleteSelected?: (nodeIds: string[]) => void;
  compactNodes?: boolean;
  arrangeRequestKey?: number;
  onToggleCompactNodes?: () => void;
  onArrange?: () => void;
  hideNavigationDock?: boolean;
}

function Canvas({
  graph,
  layout,
  focusedNodeId,
  displayIds = {},
  onCommand,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canClear,
  onClear,
  canWalk,
  canStep,
  onWalk,
  canExample,
  onExample,
  onDescribe,
  onInspect,
  playbackRoute = [],
  centerRequest = null,
  inspectEdgeRequest = null,
  selectionResetKey = 0,
  onInspectEdgeRequestHandled,
  onInspectEdge,
  selectedNodeIds = [],
  onSelectedNodeIdsChange,
  onSelectionComplete,
  onDeleteSelected,
  compactNodes = false,
  arrangeRequestKey = 0,
  onToggleCompactNodes,
  onArrange,
  hideNavigationDock = false,
}: VisualCanvasProps) {
  const { screenToFlowPosition, flowToScreenPosition, zoomIn, zoomOut, fitView, setCenter, getZoom } = useReactFlow();
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const frameAfterArrange = useRef(false);
  const lastArrangeRequestKey = useRef(arrangeRequestKey);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [connectionDrop, setConnectionDrop] = useState<{
    sourceId: string;
    flowX: number;
    flowY: number;
    left: number;
    top: number;
    sourceLeft: number;
    sourceTop: number;
    targetLeft: number;
    targetTop: number;
    targetSide: "top" | "right" | "bottom" | "left";
  } | null>(null);
  const [selectionActive, setSelectionActive] = useState(false);
  const latestSelectionIds = useRef<string[]>(selectedNodeIds);
  const lastInspectedEdgeId = useRef<string | null>(null);
  const lastSelectionResetKey = useRef(selectionResetKey);
  useEffect(() => {
    if (lastSelectionResetKey.current === selectionResetKey) return;
    lastSelectionResetKey.current = selectionResetKey;
    setDrag(null);
    setConnectionDrop(null);
    setSelectionActive(false);
    lastInspectedEdgeId.current = null;
    setSelectedEdgeId(null);
    onInspectEdgeRequestHandled?.();
    onSelectedNodeIdsChange?.([]);
  }, [onInspectEdgeRequestHandled, onSelectedNodeIdsChange, selectionResetKey]);
  const inspectEdge = (edgeId: string) => {
    setSelectedEdgeId(edgeId);
    if (lastInspectedEdgeId.current === edgeId) return;
    lastInspectedEdgeId.current = edgeId;
    onInspectEdge?.(edgeId);
  };
  const inspectedEdgeId = inspectEdgeRequest && graph.edges.some(edge => edge.id === inspectEdgeRequest.edgeId)
    ? inspectEdgeRequest.edgeId
    : selectedEdgeId;
  const selectedEdge = graph.edges.find(edge => edge.id === inspectedEdgeId);
  useEffect(() => {
    if (!inspectedEdgeId) return;
    const removeSelectedEdge = (event: KeyboardEvent) => {
      const editable = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      if (event.key !== "Delete" || event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || editable) return;
      event.preventDefault();
      onCommand({ kind: "delete", target: { kind: "edge_id", id: inspectedEdgeId } });
      setSelectedEdgeId(null);
      if (inspectEdgeRequest) onInspectEdgeRequestHandled?.();
    };
    document.addEventListener("keydown", removeSelectedEdge);
    return () => document.removeEventListener("keydown", removeSelectedEdge);
  }, [inspectEdgeRequest, inspectedEdgeId, onCommand, onInspectEdgeRequestHandled]);
  useEffect(() => {
    const clearCanvasSelection = (event: KeyboardEvent) => {
      const editable = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      const hasSelection = !!focusedNodeId || !!inspectedEdgeId || selectedNodeIds.length > 0 || !!connectionDrop;
      if (event.key !== "Escape" || event.repeat || event.defaultPrevented || event.isComposing || editable || !hasSelection) return;
      event.preventDefault();
      setConnectionDrop(null);
      lastInspectedEdgeId.current = null;
      setSelectedEdgeId(null);
      onInspectEdgeRequestHandled?.();
      onSelectedNodeIdsChange?.([]);
      if (onSelectionComplete) onSelectionComplete([]);
      else onCommand({ kind: "clear_focus" });
    };
    document.addEventListener("keydown", clearCanvasSelection);
    return () => document.removeEventListener("keydown", clearCanvasSelection);
  }, [connectionDrop, focusedNodeId, inspectedEdgeId, onCommand, onInspectEdgeRequestHandled, onSelectedNodeIdsChange, onSelectionComplete, selectedNodeIds.length]);
  const focusedBox = layout.nodes.find(box => box.id === focusedNodeId);
  const lastCenterRequest = useRef<string | null>(null);
  useEffect(() => {
    if (!centerRequest) {
      lastCenterRequest.current = null;
      return;
    }
    if (lastCenterRequest.current === centerRequest.key) return;
    const requestedBox = layout.nodes.find(box => box.id === centerRequest.nodeId);
    if (!requestedBox) return;
    lastCenterRequest.current = centerRequest.key;
    void setCenter(
      requestedBox.x + requestedBox.width / 2,
      requestedBox.y + requestedBox.height / 2,
      { zoom: Math.max(getZoom(), 1), duration: 220 },
    );
  }, [centerRequest, getZoom, layout.nodes, setCenter]);
  useEffect(() => {
    if (arrangeRequestKey === lastArrangeRequestKey.current) return;
    lastArrangeRequestKey.current = arrangeRequestKey;
    frameAfterArrange.current = true;
  }, [arrangeRequestKey]);
  useEffect(() => {
    if (!frameAfterArrange.current) return;
    frameAfterArrange.current = false;
    let cancelled = false;
    const frameArrangedChart = async () => {
      await fitView({ padding: 0.25, minZoom: readableFitMinZoom, maxZoom: 1, duration: 220 });
      if (cancelled || !focusedNodeId) return;
      const arrangedFocus = layout.nodes.find(node => node.id === focusedNodeId);
      if (!arrangedFocus) return;
      await setCenter(
        arrangedFocus.x + arrangedFocus.width / 2,
        arrangedFocus.y + arrangedFocus.height / 2,
        { zoom: getZoom(), duration: 220 },
      );
    };
    void frameArrangedChart();
    return () => { cancelled = true; };
  }, [fitView, focusedNodeId, getZoom, layout, setCenter]);
  // Never zoom out to centre: an author who has zoomed in to read a label keeps that reading size.
  const centerOnFocus = () => { if (focusedBox) void setCenter(focusedBox.x + focusedBox.width / 2, focusedBox.y + focusedBox.height / 2, { zoom: Math.max(getZoom(), 1), duration: 220 }); };
  const currentRouteStep = playbackRoute.at(-1);
  const visitedNodeIds = useMemo(() => new Set(playbackRoute.slice(0, -1).map(step => step.nodeId)), [playbackRoute]);
  const visitedEdgeIds = useMemo(() => new Set(playbackRoute.slice(0, -1).flatMap(step => step.viaEdgeId ? [step.viaEdgeId] : [])), [playbackRoute]);
  // React Flow owns ordinary single-node selection. Controlling it from semantic focus causes
  // focus loss to alternate between selected and unselected while a confirmation prompt opens.
  const controlledNodeSelection = selectedNodeIds.length > 1 ? selectedNodeIds : noControlledNodeSelection;
  const nodes: CanvasNode[] = useMemo(() => graph.nodes.map(node => {
    const box = layout.nodes.find(item => item.id === node.id)!;
    const playbackState: PlaybackMark | undefined = node.id === currentRouteStep?.nodeId ? "current" : visitedNodeIds.has(node.id) ? "visited" : undefined;
    return { id: node.id, type: "flowNode", selectable: true, selected: controlledNodeSelection.includes(node.id), position: { x: box.x, y: box.y }, width: box.width, height: box.height, measured: { width: box.width, height: box.height },
      style: { width: box.width, height: box.height }, data: { label: node.label, displayId: displayIds[node.id], nodeType: node.type, focused: node.id === focusedNodeId, compact: compactNodes,
        playbackState,
        onRename: (newLabel: string) => onCommand({ kind: "rename", node: { kind: "id", value: node.id }, newLabel }),
        onFocus: () => { lastInspectedEdgeId.current = null; setSelectedEdgeId(null); onSelectedNodeIdsChange?.([node.id]); onCommand({ kind: "focus", node: { kind: "id", value: node.id } }); } } };
  }), [graph, layout, focusedNodeId, displayIds, compactNodes, onCommand, onSelectedNodeIdsChange, controlledNodeSelection, currentRouteStep?.nodeId, visitedNodeIds]);
  const liveLayout = useMemo(() => drag ? routeEdges(graph, layout.nodes.map(node => node.id === drag.id ? { ...node, x: drag.x, y: drag.y } : node)) : layout.edges, [drag, graph, layout]);
  const edges: RoutedEdge[] = useMemo(() => graph.edges.map(edge => {
    const playbackState: PlaybackMark | undefined = edge.id === currentRouteStep?.viaEdgeId ? "current" : visitedEdgeIds.has(edge.id) ? "visited" : undefined;
    const source = graph.nodes.find(node => node.id === edge.source)?.label;
    const target = graph.nodes.find(node => node.id === edge.target)?.label;
    const accessibleName = `Edit arrow from ${source} to ${target}${edge.label ? ` labelled ${edge.label}` : " unlabelled"}`;
    const markerColor = edge.id === inspectedEdgeId ? "#244ea9" : playbackState === "current" ? "#c25f0a" : playbackState === "visited" ? "#315ac8" : "#536b99";
    return { ...edge, type: "routed", selected: edge.id === inspectedEdgeId, ariaLabel: accessibleName, className: playbackState ? `playback-edge is-${playbackState}` : undefined, data: { points: liveLayout.find(item => item.id === edge.id)!.points, playbackState, accessibleName }, markerEnd: { type: MarkerType.ArrowClosed, color: markerColor } };
  }), [graph, liveLayout, inspectedEdgeId, currentRouteStep?.viaEdgeId, visitedEdgeIds]);
  const addConnectedNode = (type: typeof semanticTypes[number]) => {
    if (!connectionDrop) return;
    const { width, height } = nodeDimensions(type, compactNodes ? "compact" : "standard");
    const position = connectionDrop.targetSide === "left"
      ? { x: connectionDrop.flowX, y: connectionDrop.flowY - height / 2 }
      : connectionDrop.targetSide === "right"
        ? { x: connectionDrop.flowX - width, y: connectionDrop.flowY - height / 2 }
        : connectionDrop.targetSide === "top"
          ? { x: connectionDrop.flowX - width / 2, y: connectionDrop.flowY }
          : { x: connectionDrop.flowX - width / 2, y: connectionDrop.flowY - height };
    onCommand({ kind: "compound", commands: [
      { kind: "add_node", type, label: type[0].toUpperCase() + type.slice(1), placement: null },
      { kind: "move_to", node: { kind: "recent" }, position },
      { kind: "connect", source: { kind: "id", value: connectionDrop.sourceId }, target: { kind: "recent" }, label: null },
    ] });
    setConnectionDrop(null);
  };
  return <div ref={canvasAreaRef} className="canvas-area" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={event => {
    event.preventDefault();
    setConnectionDrop(null);
    const type = event.dataTransfer.getData("application/koi-node");
    if (!semanticTypes.includes(type as typeof semanticTypes[number])) return;
    const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const { width, height } = nodeDimensions(type as typeof semanticTypes[number], compactNodes ? "compact" : "standard");
    onCommand({ kind: "compound", commands: [{ kind: "add_node", type: type as typeof semanticTypes[number], label: type[0].toUpperCase() + type.slice(1), placement: null }, { kind: "move_to", node: { kind: "recent" }, position: { x: point.x - width / 2, y: point.y - height / 2 } }] });
  }}><ReactFlow<CanvasNode, RoutedEdge> nodes={nodes.map(node => drag?.id === node.id ? { ...node, position: { x: drag.x, y: drag.y } } : node)} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
    connectionMode={ConnectionMode.Loose} connectionRadius={32}
    zoomOnDoubleClick={false} selectionOnDrag={selectionActive} selectionMode={SelectionMode.Partial} panOnDrag={!selectionActive} multiSelectionKeyCode={null}
    onPaneClick={() => { setConnectionDrop(null); lastInspectedEdgeId.current = null; setSelectedEdgeId(null); onSelectedNodeIdsChange?.([]); onCommand({ kind: "clear_focus" }); }}
    onSelectionChange={({ nodes: selectedNodes }) => {
      const nodeIds = selectedNodes.map(node => node.id);
      latestSelectionIds.current = nodeIds;
      onSelectedNodeIdsChange?.(nodeIds);
      if (nodeIds.length) { setConnectionDrop(null); lastInspectedEdgeId.current = null; setSelectedEdgeId(null); }
    }}
    onSelectionEnd={() => onSelectionComplete?.(latestSelectionIds.current)}
    onEdgeClick={(_, edge) => { setConnectionDrop(null); onSelectedNodeIdsChange?.([]); onInspectEdgeRequestHandled?.(); inspectEdge(edge.id); }}
    onEdgesChange={changes => { for (const change of changes) if (change.type === "select") { if (change.selected) inspectEdge(change.id); else { lastInspectedEdgeId.current = null; setSelectedEdgeId(current => current === change.id ? null : current); } } }}
    isValidConnection={connection => connection.source !== connection.target}
    nodesDraggable
    onNodesChange={changes => { for (const change of changes) { if (change.type === "position" && change.position && change.dragging) setDrag({ id: change.id, ...change.position }); } }}
    onNodeDragStop={(_, node) => {
      onCommand({ kind: "move_to", node: { kind: "id", value: node.id }, position: node.position });
      setDrag(null);
    }} nodesFocusable={false} edgesFocusable elementsSelectable edgesReconnectable={false} deleteKeyCode={null}
    onConnect={({ source, target }) => { setConnectionDrop(null); onCommand({ kind: "connect", source: { kind: "id", value: source }, target: { kind: "id", value: target }, label: null }); }}
    onConnectEnd={(event, connection) => {
      if (connection.isValid || connection.toNode || !connection.fromNode) return;
      const pointer = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!pointer) return;
      const flowPoint = screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY });
      const rect = canvasAreaRef.current?.getBoundingClientRect();
      const localX = pointer.clientX - (rect?.left ?? 0);
      const localY = pointer.clientY - (rect?.top ?? 0);
      const sourceBox = layout.nodes.find(node => node.id === connection.fromNode?.id);
      if (!sourceBox) return;
      const sourceCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
      const deltaX = flowPoint.x - sourceCenter.x;
      const deltaY = flowPoint.y - sourceCenter.y;
      const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
      const sourceFlowPoint = horizontal
        ? { x: deltaX >= 0 ? sourceBox.x + sourceBox.width : sourceBox.x, y: sourceCenter.y }
        : { x: sourceCenter.x, y: deltaY >= 0 ? sourceBox.y + sourceBox.height : sourceBox.y };
      const targetSide = horizontal ? (deltaX >= 0 ? "left" : "right") : (deltaY >= 0 ? "top" : "bottom");
      const sourceScreenPoint = flowToScreenPosition(sourceFlowPoint);
      const left = rect?.width ? Math.min(Math.max(12, localX), Math.max(12, rect.width - 288)) : localX;
      const top = rect?.height ? Math.min(Math.max(12, localY), Math.max(12, rect.height - 220)) : localY;
      setConnectionDrop({
        sourceId: connection.fromNode.id,
        flowX: flowPoint.x,
        flowY: flowPoint.y,
        left,
        top,
        sourceLeft: sourceScreenPoint.x - (rect?.left ?? 0),
        sourceTop: sourceScreenPoint.y - (rect?.top ?? 0),
        targetLeft: localX,
        targetTop: localY,
        targetSide,
      });
    }}
    ariaLabelConfig={{ "node.a11yDescription.default": "Select a node to focus it. Use the editing form for keyboard movement and deletion.", "edge.a11yDescription.default": "Connections are available in the chart outline." }}
    fitView fitViewOptions={{ minZoom: readableFitMinZoom, maxZoom: 1, padding: 0.25 }} minZoom={0.1} maxZoom={2}>
    <Background gap={20} color="#d4ddea" /><FitChart layout={layout} />
  </ReactFlow>
  {connectionDrop && <svg className="connection-drop-preview" data-testid="pending-connection-line" aria-hidden="true">
    <defs><marker id="pending-connection-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
    <path
      d={`M ${connectionDrop.sourceLeft} ${connectionDrop.sourceTop} L ${(connectionDrop.sourceLeft + connectionDrop.targetLeft) / 2} ${connectionDrop.sourceTop} L ${(connectionDrop.sourceLeft + connectionDrop.targetLeft) / 2} ${connectionDrop.targetTop} L ${connectionDrop.targetLeft} ${connectionDrop.targetTop}`}
      markerEnd="url(#pending-connection-arrow)"
    />
  </svg>}
  {connectionDrop && <div className="connection-drop-chooser nodrag nopan nowheel" role="dialog" aria-modal="false" aria-label="Add connected shape" style={{ left: connectionDrop.left, top: connectionDrop.top }} onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setConnectionDrop(null); } }}>
    <div className="connection-drop-heading"><h3>Add connected shape</h3><button type="button" aria-label="Close shape choices" onClick={() => setConnectionDrop(null)}>×</button></div>
    <p>Choose what comes next.</p>
    <div className="connection-drop-options">
      {semanticTypes.map((type, index) => <button key={type} type="button" autoFocus={index === 0} aria-label={`Add connected ${type}`} onClick={() => addConnectedNode(type)}>
        <svg viewBox="0 0 76 48" aria-hidden="true">{type === "decision" ? <polygon points="38,3 72,24 38,45 4,24" /> : <rect x="5" y="7" width="66" height="34" rx={type === "process" ? 4 : 17} />}</svg>
        <span>{type[0].toUpperCase() + type.slice(1)}</span>
      </button>)}
    </div>
  </div>}
  <CanvasControls canFit={layout.nodes.length > 0} canCenter={!!focusedBox}
    onZoomIn={() => void zoomIn({ duration: 160 })} onZoomOut={() => void zoomOut({ duration: 160 })}
    onFit={() => void fitView({ padding: 0.25, minZoom: readableFitMinZoom, maxZoom: 1, duration: 220 })} onCenter={centerOnFocus}
    canUndo={canUndo} canRedo={canRedo} onUndo={onUndo} onRedo={onRedo}
    canClear={canClear} onClear={onClear}
    selectionActive={selectionActive} onToggleSelection={() => setSelectionActive(active => !active)}
    compactActive={compactNodes} onToggleCompact={onToggleCompactNodes}
    canArrange={layout.nodes.length > 1} onArrange={onArrange ? () => { frameAfterArrange.current = true; onArrange(); } : undefined} />
  {!hideNavigationDock && !selectedEdge && selectedNodeIds.length < 2 && !connectionDrop && onWalk && onDescribe && onInspect && (
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
      </div>
    </div>
  )}
  {selectedNodeIds.length > 1 && <div className="multi-selection-inspector canvas-inspector nodrag nopan" role="group" aria-label={`${selectedNodeIds.length} shapes selected`}>
    <div className="inspector-header">
      <div className="multi-selection-heading"><span className="multi-selection-count">{selectedNodeIds.length}</span><h3>Shapes selected</h3></div>
    </div>
    <p>Remove all selected shapes together, or clear the highlight.</p>
    <div className="inspector-actions">
      <button type="button" className="inspector-delete" onClick={() => onDeleteSelected?.(selectedNodeIds)}>Delete selected</button>
      <button type="button" className="inspector-secondary" onClick={() => { onSelectedNodeIdsChange?.([]); onSelectionComplete?.([]); }}>Deselect all</button>
    </div>
  </div>}
  {selectedEdge && <ArrowInspector key={`${selectedEdge.id}-${selectedEdge.label ?? ""}`} edge={selectedEdge}
    source={graph.nodes.find(node => node.id === selectedEdge.source)!} target={graph.nodes.find(node => node.id === selectedEdge.target)!}
    onCommand={onCommand} onClose={() => { lastInspectedEdgeId.current = null; setSelectedEdgeId(null); onInspectEdgeRequestHandled?.(); }} />}</div>;
}

export default function VisualCanvas(props: VisualCanvasProps) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}
