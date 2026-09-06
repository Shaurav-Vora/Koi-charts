"use client";
import { useCallback, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../graph/types";
export type CanvasNode = Node<{ label: string; nodeType: NodeType; focused: boolean; onFocus: () => void; onRename: (label: string) => void }, "flowNode">;
export default function FlowNode({ data }: NodeProps<CanvasNode>) {
  const focusInput = useCallback((input: HTMLInputElement | null) => { if (input) { input.focus(); input.select(); } }, []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return <div className={`flow-node ${data.nodeType} ${data.focused ? "is-focused" : ""}`}>
    <Handle id="top" type="source" position={Position.Top} title="Drag to a dot on another shape to connect" />
    <Handle id="left" type="source" position={Position.Left} title="Drag to a dot on another shape to connect" />
    <Handle id="right" type="source" position={Position.Right} title="Drag to a dot on another shape to connect" />
    <svg className="node-shape" viewBox={data.nodeType === "decision" ? "0 0 230 150" : "0 0 190 86"} aria-hidden="true">
      {data.nodeType === "decision" ? <polygon points="115,2 228,75 115,148 2,75" /> : <rect x="2" y="2" width="186" height="82" rx={data.nodeType === "process" ? 5 : 41} />}
    </svg>
    {editing ? <form className="node-content nodrag nopan" onSubmit={event => { event.preventDefault(); data.onRename(draft); setEditing(false); }} onDoubleClick={event => event.stopPropagation()}>
      <input className="inline-node-label" aria-label="Rename shape" value={draft} ref={focusInput} onChange={event => setDraft(event.target.value)} onKeyDown={event => { event.stopPropagation(); if(event.key === "Escape") setEditing(false); }} onBlur={() => setEditing(false)} />
    </form> : <button className="node-content nopan" onDoubleClick={event => { event.stopPropagation(); setDraft(data.label); setEditing(true); }} onClick={data.onFocus} aria-label={`Focus ${data.label}`} title={data.label}>
      <span className="node-kind">{data.nodeType}</span><strong>{data.label}</strong>{data.focused && <span className="focus-badge">Focused</span>}
    </button>}
    <Handle id="bottom" type="source" position={Position.Bottom} title="Drag to a dot on another shape to connect" />
  </div>;
}
