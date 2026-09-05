"use client";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeType } from "../graph/types";
export type CanvasNode = Node<{ label: string; nodeType: NodeType; focused: boolean; onFocus: () => void }, "flowNode">;
export default function FlowNode({ data }: NodeProps<CanvasNode>) {
  return <div className={`flow-node ${data.nodeType} ${data.focused ? "is-focused" : ""}`}>
    <Handle type="target" position={Position.Top} />
    <svg className="node-shape" viewBox={data.nodeType === "decision" ? "0 0 230 150" : "0 0 190 86"} aria-hidden="true">
      {data.nodeType === "decision" ? <polygon points="115,2 228,75 115,148 2,75" /> : <rect x="2" y="2" width="186" height="82" rx={data.nodeType === "process" ? 5 : 41} />}
    </svg>
    <button className="node-content nopan" onClick={data.onFocus} aria-label={`Focus ${data.label}`} title={data.label}>
      <span className="node-kind">{data.nodeType}</span><strong>{data.label}</strong>{data.focused && <span className="focus-badge">Focused</span>}
    </button>
    <Handle type="source" position={Position.Bottom} />
  </div>;
}
