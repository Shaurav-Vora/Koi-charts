"use client";
import { useId, useState, type FormEvent } from "react";
import type { GraphCommand } from "../commands/schema";
import { nodeTypes, placementRelations, type FlowGraph, type NodeType, type PlacementRelation } from "../graph/types";

type Props = { graph: FlowGraph; focusedNodeId: string | null; onCommand: (command: GraphCommand) => void };
const actions = ["add_node", "connect", "rename", "move", "delete", "delete_edge", "focus", "trace_path"] as const;
type Action = typeof actions[number];
const names: Record<Action, string> = { add_node: "Add node", connect: "Connect nodes", rename: "Rename node", move: "Move node", delete: "Delete node", delete_edge: "Delete connection", focus: "Focus node", trace_path: "Trace path" };
const ref = (value: string) => ({ kind: "id" as const, value });

export default function CommandForm(props: Props) {
  const [action, setAction] = useState<Action>("add_node");
  return <section className="editing-panel" aria-label="Chart editing">
    <label className="action-field">Editing action<select value={action} onChange={event => setAction(event.target.value as Action)}>{actions.map(kind => <option key={kind} value={kind}>{names[kind]}</option>)}</select></label>
    <ActionForm key={action} {...props} action={action} />
  </section>;
}
function ActionForm({ action, graph, focusedNodeId, onCommand }: Props & { action: Action }) {
  const id = useId();
  const [text, setText] = useState(""); const [type, setType] = useState<NodeType>("process");
  const [node, setNode] = useState(""); const [target, setTarget] = useState("");
  const [relation, setRelation] = useState<PlacementRelation>("after"); const [edge, setEdge] = useState("");
  const fallback = graph.nodes.find(item => item.id === focusedNodeId)?.id ?? graph.nodes[0]?.id ?? "";
  const source = graph.nodes.some(item => item.id === node) ? node : action === "connect" || action === "trace_path" ? graph.nodes[0]?.id ?? "" : fallback;
  const destination = graph.nodes.some(item => item.id === target) ? target : graph.nodes.find(item => item.id !== source)?.id ?? "";
  const edgeId = graph.edges.some(item => item.id === edge) ? edge : graph.edges[0]?.id ?? "";
  const selectNode = (label: string, value: string, onChange: (value: string) => void, suffix: string) => <label htmlFor={`${id}-${suffix}`}>{label}<select id={`${id}-${suffix}`} value={value} onChange={event => onChange(event.target.value)} required>
    <option value="" disabled>Choose a node</option>{graph.nodes.map(item => <option key={item.id} value={item.id}>{item.label} ({item.type}, {item.id})</option>)}
  </select></label>;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    switch (action) {
      case "add_node": onCommand({ kind: "add_node", type, label: text, placement: null }); break;
      case "connect": onCommand({ kind: "connect", source: ref(source), target: ref(destination), label: text || null }); break;
      case "rename": onCommand({ kind: "rename", node: ref(source), newLabel: text }); break;
      case "move": onCommand({ kind: "move", node: ref(source), placement: { relation, reference: ref(destination) } }); break;
      case "delete": onCommand({ kind: "delete", target: { kind: "node", node: ref(source) } }); break;
      case "delete_edge": onCommand({ kind: "delete", target: { kind: "edge_id", id: edgeId } }); break;
      case "focus": onCommand({ kind: "focus", node: ref(source) }); break;
      case "trace_path": onCommand({ kind: "trace_path", start: ref(source), end: ref(destination) }); break;
    }
  }
  return <form className="command-form" onSubmit={submit}>
    {action === "add_node" && <label>Node type<select value={type} onChange={event => setType(event.target.value as NodeType)}>{nodeTypes.map(kind => <option value={kind} key={kind}>{kind[0].toUpperCase() + kind.slice(1)}</option>)}</select></label>}
    {!["add_node", "delete_edge"].includes(action) && selectNode(action === "connect" || action === "trace_path" ? "From node" : "Node", source, setNode, "node")}
    {["connect", "move", "trace_path"].includes(action) && selectNode(action === "move" ? "Reference node" : "To node", destination, setTarget, "target")}
    {action === "move" && <label>Position<select value={relation} onChange={event => setRelation(event.target.value as PlacementRelation)}>{placementRelations.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>}
    {["add_node", "rename", "connect"].includes(action) && <label>{action === "add_node" ? "Node label" : action === "rename" ? "New label" : "Connection label (optional)"}<input value={text} onChange={event => setText(event.target.value)} required={action !== "connect"} placeholder={action === "connect" ? "e.g. yes" : "e.g. Validate card"} /></label>}
    {action === "delete_edge" && <label>Connection<select required value={edgeId} onChange={event => setEdge(event.target.value)}><option value="" disabled>Choose a connection</option>{graph.edges.map(item => <option key={item.id} value={item.id}>{graph.nodes.find(n => n.id === item.source)?.label} to {graph.nodes.find(n => n.id === item.target)?.label} ({item.label ?? "unlabeled"}, {item.id})</option>)}</select></label>}
    <button className={action.startsWith("delete") ? "danger-button" : "primary-button"} type="submit" disabled={action !== "add_node" && (action === "delete_edge" ? !graph.edges.length : !graph.nodes.length)}>{names[action]}</button>
  </form>;
}
