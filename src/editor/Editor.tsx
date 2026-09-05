"use client";
import { Component, useCallback, useMemo, useReducer, type ReactNode } from "react";
import type { GraphCommand } from "../commands/schema";
import type { FlowGraph } from "../graph/types";
import { layoutGraph } from "../visual/layout";
import VisualCanvas from "../visual/VisualCanvas";
import { ShapePalette, NodeInspector } from "./ShapePalette";
import CommandForm from "./CommandForm";
import { createEditorState, editorReducer } from "./reducer";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="canvas-error" role="alert"><p>Visual canvas unavailable. Your chart is preserved in the outline below.</p><button onClick={() => this.setState({ failed: false })}>Retry canvas</button></div> : this.props.children; }
}
function LaidOutCanvas(props: { graph: FlowGraph; focusedNodeId: string | null; onCommand: (command: GraphCommand) => void }) {
  const layout = useMemo(() => layoutGraph(props.graph), [props.graph]);
  return <VisualCanvas {...props} layout={layout} />;
}
export default function Editor() {
  const [state, dispatch] = useReducer(editorReducer, undefined, createEditorState);
  const onCommand = useCallback((command: GraphCommand) => dispatch({ type: "command", command, idSeed: crypto.randomUUID() }), []);
  const { graph, focusedNodeId, pending, history, version } = state.engine;
  const focused = graph.nodes.find(node => node.id === focusedNodeId);
  const status = state.outcome === "idle" ? "Idle" : state.outcome === "error" ? "Command not applied" : state.outcome === "confirmation" ? "Confirmation needed" : state.outcome === "clarification" ? "Clarification needed" : state.outcome === "committed" ? "Change applied" : state.outcome === "focused" ? "Focus updated" : state.outcome === "cancelled" ? "Cancelled" : "Chart explored";
  return <>
    <div className="workspace-heading"><div><h2>Your workspace</h2><p>Build a flowchart, one clear step at a time.</p></div><div className="status" role="status" aria-live="polite"><span className="status-dot" aria-hidden="true" />{status}</div></div>
    <div className="editor-toolbar"><div className="history-controls"><button disabled={!history.past.length} onClick={() => onCommand({ kind: "undo" })}>Undo</button><button disabled={!history.future.length} onClick={() => onCommand({ kind: "redo" })}>Redo</button></div><div className="query-controls"><button onClick={() => onCommand({ kind: "describe", scope: "chart" })}>Describe chart</button><button disabled={!focused} onClick={() => onCommand({ kind: "inspect", node: null })}>Inspect focus</button><button onClick={() => onCommand({ kind: "validate" })}>Validate chart</button></div></div>
    
    <section className={`command-feedback ${state.outcome === "error" ? "has-error" : ""}`} aria-label="Command feedback">
      <p role={state.outcome === "error" ? "alert" : undefined} aria-live={state.outcome === "error" ? undefined : "polite"}>{state.message}</p>
      {pending && <div className="pending-actions">
        {pending.kind === "deletion" ? <button className="danger-button" onClick={() => onCommand({ kind: "confirm" })}>Confirm deletion</button> : pending.candidates.slice(0, 3).map(id => <button key={id} onClick={() => dispatch({ type: "choose", candidateId: id, idSeed: crypto.randomUUID() })}>{pending.elementKind === "node" ? graph.nodes.find(node => node.id === id)?.label ?? "New node" : "Connection"} ({id})</button>)}
        <button onClick={() => onCommand({ kind: "cancel" })}>Cancel</button>
      </div>}
    </section>
    <div className="diagram-workbench"><div className="palette-column"><ShapePalette lastNodeId={graph.nodes.at(-1)?.id} onCommand={onCommand} />{focused && <NodeInspector key={`${focused.id}-${focused.label}`} node={focused} onCommand={onCommand} />}</div>
      <section className="display visual-display" aria-labelledby="visual-title" data-graph-version={version}>
        <div className="display-heading"><h3 id="visual-title">Visual flowchart</h3><span className="count">{graph.nodes.length} nodes · {graph.edges.length} connections</span></div>
        <div className="canvas-wrap"><CanvasBoundary key={version}><LaidOutCanvas graph={graph} focusedNodeId={focusedNodeId} onCommand={onCommand} /></CanvasBoundary>{!graph.nodes.length && <div className="canvas-welcome"><h4>Your chart starts here</h4><p>Drag a shape from the left, or click one to begin.</p></div>}</div>
        <div className="display-footer"><p>Drag shapes to snap beside a nearby node. Connect their dots. Select a shape to edit its label.</p></div>
      </section>
    </div><details className="keyboard-editor"><summary>Keyboard editing &amp; advanced commands</summary><CommandForm graph={graph} focusedNodeId={focusedNodeId} onCommand={onCommand} /></details><div className="secondary-displays">
      <section className="display tactile-display" aria-labelledby="tactile-title">
        <div className="display-heading"><h3 id="tactile-title">Tactile display simulator</h3><span className="simulator-tag">Preview</span></div>
        <div className="tactile-surface"><div className="pin-matrix" aria-hidden="true" /><div className="tactile-empty"><h4>No pins raised</h4><p>Tactile rendering is not connected yet. Focused node details are shown below in plain text.</p></div></div>
        <section className="information-strip" aria-label="Focused node"><h4>Braille information strip</h4><p>{focused ? `${focused.label} (${focused.type})` : "No node selected"}</p></section>
        <p className="simulation-note">Digital demonstration only. This is not a physical tactile display or validated Braille output.</p>
      </section>
    </div>
    <section className="chart-structure" aria-label="Chart structure"><h3>Chart outline</h3><p className="outline-intro">The same chart, available as text. Node buttons change focus.</p>
      {graph.nodes.length ? <ul className="node-list">{graph.nodes.map(node => <li key={node.id}><button aria-label={`Focus ${node.label}`} aria-pressed={node.id === focusedNodeId} onClick={() => onCommand({ kind: "focus", node: { kind: "id", value: node.id } })}>{node.label}</button><span>{node.type}{node.id === focusedNodeId ? " · Focused" : ""}</span></li>)}</ul> : <p>No nodes yet.</p>}
      <h4>Connections</h4>{graph.edges.length ? <ul className="edge-list">{graph.edges.map(edge => <li key={edge.id}>{graph.nodes.find(node => node.id === edge.source)?.label} → {graph.nodes.find(node => node.id === edge.target)?.label} <span>({edge.label ?? "unlabeled"})</span></li>)}</ul> : <p>No connections yet.</p>}
    </section>
  </>;
}
