"use client";
import { useState } from "react";
import type { GraphCommand } from "../commands/schema";
import { nodeTypes, type FlowNode } from "../graph/types";
export function ShapePalette({ lastNodeId, onCommand }: { lastNodeId?: string; onCommand: (command: GraphCommand) => void }) {
  return <aside className="shape-palette" aria-label="Shapes"><h3>Shapes</h3><p>Click or drag onto the canvas</p><div className="shape-buttons">{nodeTypes.map(type => <button key={type} draggable onDragStart={event => { event.dataTransfer.setData("application/koi-node", type); event.dataTransfer.effectAllowed = "copy"; }} aria-label={`Insert ${type}`} onClick={() => onCommand({ kind: "add_node", type, label: type[0].toUpperCase() + type.slice(1), placement: lastNodeId ? { relation: "right_of", reference: { kind: "id", value: lastNodeId } } : null })}><svg viewBox="0 0 100 64" aria-hidden="true">{type === "decision" ? <polygon points="50,4 94,32 50,60 6,32" /> : <rect x="10" y="12" width="80" height="40" rx={type === "process" ? 3 : 20} />}</svg><span>{type[0].toUpperCase() + type.slice(1)}</span></button>)}</div><p className="palette-tip">Drag from any dot to a dot on another shape. Arrows follow the direction you drag and are automatically routed.</p></aside>;
}
export function NodeInspector({ node, onCommand }: { node: FlowNode; onCommand: (command: GraphCommand) => void }) {
  const [label, setLabel] = useState(node.label);
  return <form className="node-inspector" aria-label="Selected shape" onSubmit={event => { event.preventDefault(); onCommand({ kind: "rename", node: { kind: "id", value: node.id }, newLabel: label }); }}><h3>Selected shape</h3><p>{node.type}</p><label>Shape label<input required value={label} onChange={event => setLabel(event.target.value)} /></label><button type="submit">Apply label</button><button type="button" onClick={() => onCommand({ kind: "delete", target: { kind: "node", node: { kind: "id", value: node.id } } })}>Delete selected</button></form>;
}
