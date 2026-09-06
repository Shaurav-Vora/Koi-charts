"use client";
import { useState } from "react";
import type { FlowEdge, FlowNode } from "../graph/types";
import type { GraphCommand } from "../commands/schema";

export default function ArrowInspector({ edge, source, target, onCommand, onClose }: {
 edge: FlowEdge; source: FlowNode; target: FlowNode; onCommand: (command: GraphCommand) => void; onClose: () => void;
}) {
 const [label, setLabel] = useState(edge.label ?? "");
 const apply = (value: string) => { setLabel(value); onCommand({ kind: "label_edge", edgeId: edge.id, label: value.trim() || null }); };
 return <form className="arrow-inspector nodrag nopan" aria-label="Selected arrow" onSubmit={event => { event.preventDefault(); apply(label); }}
   onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") onClose(); }}>
  <div className="arrow-inspector-heading"><h3>Selected arrow</h3><button type="button" aria-label="Close arrow editor" onClick={onClose}>×</button></div>
  <p className="arrow-endpoints">{source.label} → {target.label}</p>
  <label>Arrow label<input autoFocus maxLength={200} value={label} onChange={event => setLabel(event.target.value)} placeholder="Add a label" /></label>
  {source.type === "decision" && <div className="branch-shortcuts" role="group" aria-label="Decision branch label">
   {["Yes", "No"].map(value => <button key={value} type="button" aria-pressed={edge.label === value} onClick={() => apply(value)}>{value}</button>)}
  </div>}
  <div className="arrow-inspector-actions"><button type="submit">Apply label</button><button type="button" disabled={!edge.label && !label} onClick={() => apply("")}>Clear label</button></div>
  <p className="arrow-editor-hint">Labels describe the direction of this arrow. Undo restores the previous label.</p>
 </form>;
}
