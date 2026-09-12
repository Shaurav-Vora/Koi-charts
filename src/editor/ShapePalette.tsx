"use client";
import { useState } from "react";
import type { GraphCommand } from "../commands/schema";
import { nodeTypes, type FlowNode } from "../graph/types";
export function ShapePalette({ lastNodeId, onCommand }: { lastNodeId?: string; onCommand: (command: GraphCommand) => void }) {
  return (
    <aside className="shape-palette" aria-label="Shapes">
      <div className="palette-header">
        <h3>Shapes</h3>
        <span className="palette-count" aria-hidden="true">4</span>
      </div>
      <p className="palette-subtext">Click to add or drag to canvas</p>
      <div className="shape-buttons">
        {nodeTypes.map(type => (
          <button
            key={type}
            className={`shape-item shape-${type}`}
            draggable
            onDragStart={event => {
              event.dataTransfer.setData("application/koi-node", type);
              event.dataTransfer.effectAllowed = "copy";
            }}
            aria-label={`Insert ${type}`}
            onClick={() => onCommand({
              kind: "add_node",
              type,
              label: type[0].toUpperCase() + type.slice(1),
              placement: lastNodeId ? { relation: "right_of", reference: { kind: "id", value: lastNodeId } } : null
            })}
          >
            <div className="shape-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 100 64" className="shape-svg">
                {type === "decision" ? (
                  <polygon points="50,6 92,32 50,58 8,32" />
                ) : (
                  <rect x="10" y="12" width="80" height="40" rx={type === "process" ? 4 : 20} />
                )}
              </svg>
            </div>
            <div className="shape-details">
              <span className="shape-title">{type[0].toUpperCase() + type.slice(1)}</span>
              <span className="shape-kind-label">
                {type === "start" ? "Start / Entry" : type === "process" ? "Step / Action" : type === "decision" ? "Branch / Choice" : "End / Exit"}
              </span>
            </div>
            <span className="shape-drag-handle" aria-hidden="true">⋮⋮</span>
          </button>
        ))}
      </div>
      <div className="palette-tip-card">
        <div className="tip-header">
          <svg className="tip-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <circle cx="8" cy="8" r="7" />
            <path d="M8 5v3.5m0 2.5h.01" strokeLinecap="round" />
          </svg>
          <span>Quick connect</span>
        </div>
        <p className="palette-tip">Hover any shape to reveal connection dots, then drag to connect.</p>
      </div>
    </aside>
  );
}

export function NodeInspector({ node, onCommand, onClose }: { node: FlowNode; onCommand: (command: GraphCommand) => void; onClose: () => void }) {
  const [label, setLabel] = useState(node.label);
  return (
    <form
      className="node-inspector canvas-inspector nodrag nopan"
      aria-label="Selected shape"
      onSubmit={event => {
        event.preventDefault();
        onCommand({ kind: "rename", node: { kind: "id", value: node.id }, newLabel: label });
      }}
      onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") onClose(); }}
    >
      <div className="inspector-header">
        <h3>Selected shape</h3>
        <div className="inspector-heading-actions">
          <span className={`inspector-tag tag-${node.type}`}>{node.type}</span>
          <button type="button" className="inspector-close" aria-label="Close shape editor" onClick={onClose}>×</button>
        </div>
      </div>
      <label>
        Shape label
        <input required value={label} onChange={event => setLabel(event.target.value)} />
      </label>
      <div className="inspector-actions">
        <button type="submit" className="inspector-apply">Apply label</button>
        <button
          type="button"
          className="inspector-delete"
          onClick={() => onCommand({ kind: "delete", target: { kind: "node", node: { kind: "id", value: node.id } } })}
        >
          Delete shape
        </button>
      </div>
    </form>
  );
}
