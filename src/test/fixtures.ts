export function graphFixture() {
  return {
    schemaVersion: 1 as const,
    nodes: [
      { id: "n1", type: "start" as const, label: "Begin" },
      { id: "n2", type: "process" as const, label: "Validate card" },
      { id: "n3", type: "decision" as const, label: "Payment approved" },
      { id: "n4", type: "end" as const, label: "Show receipt" },
    ],
    edges: [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4", label: "yes" },
    ],
  };
}

export const validCommands: { name: string; command: Record<string, unknown> }[] = [
  { name: "add start", command: { kind: "add_node", type: "start", label: "Begin", placement: null } },
  ...["process", "decision", "end"].map(type => ({ name: `add ${type}`, command: { kind: "add_node", type, label: "Node", placement: null } })),
  ...["before", "after", "above", "below", "left_of", "right_of"].map(relation => ({ name: `placement ${relation}`, command: { kind: "add_node", type: "process", label: "Check", placement: { relation, reference: { kind: "label", value: "Begin" } } } })),
  { name: "connect with label", command: { kind: "connect", source: { kind: "id", value: "n1" }, target: { kind: "label", value: "End" }, label: "yes" } },
  { name: "connect without label", command: { kind: "connect", source: { kind: "focus" }, target: { kind: "recent" }, label: null } },
  { name: "rename", command: { kind: "rename", node: { kind: "focus" }, newLabel: "Updated" } },
  { name: "move", command: { kind: "move", node: { kind: "id", value: "n1" }, placement: { relation: "below", reference: { kind: "recent" } } } },
  { name: "delete node", command: { kind: "delete", target: { kind: "node", node: { kind: "label", value: "Begin" } } } },
  { name: "delete edge ID", command: { kind: "delete", target: { kind: "edge_id", id: "e1" } } },
  { name: "delete edge endpoints", command: { kind: "delete", target: { kind: "edge", source: { kind: "id", value: "n1" }, target: { kind: "id", value: "n2" }, label: null } } },
  { name: "delete labeled edge", command: { kind: "delete", target: { kind: "edge", source: { kind: "focus" }, target: { kind: "recent" }, label: "yes" } } },
  ...["id", "label"].map(kind => ({ name: `focus by ${kind}`, command: { kind: "focus", node: { kind, value: "n1" } } })),
  ...["focus", "recent"].map(kind => ({ name: `focus by ${kind}`, command: { kind: "focus", node: { kind } } })),
  ...["undo", "redo", "validate", "confirm", "cancel"].map(kind => ({ name: kind, command: { kind } })),
  ...["chart", "focus"].map(scope => ({ name: `describe ${scope}`, command: { kind: "describe", scope } })),
  ...["next", "back", "first", "last", "stay"].map(direction => ({ name: `walk ${direction}`, command: { kind: "walk", direction, branch: null } })),
  { name: "walk a named branch", command: { kind: "walk", direction: "next", branch: "yes" } },
  ...["start", "stop", "restart", "repeat"].map(action => ({ name: `playback ${action}`, command: { kind: "playback", action, choice: null } })),
  { name: "playback choice", command: { kind: "playback", action: "choose", choice: "yes" } },
  ...["open", "next", "previous", "repeat", "close"].map(action => ({ name: `audit ${action}`, command: { kind: "audit", action } })),
  { name: "inspect focused", command: { kind: "inspect", node: null } },
  { name: "inspect named", command: { kind: "inspect", node: { kind: "label", value: "Begin" } } },
  { name: "trace to target", command: { kind: "trace_path", start: { kind: "label", value: "Begin" }, end: { kind: "id", value: "n4" } } },
  { name: "trace without target", command: { kind: "trace_path", start: { kind: "focus" }, end: null } },
  { name: "single compound edit", command: { kind: "compound", commands: [{ kind: "rename", node: { kind: "recent" }, newLabel: "Final" }] } },
  { name: "ten compound edits", command: { kind: "compound", commands: Array.from({ length: 10 }, () => ({ kind: "add_node", type: "process", label: "Check", placement: null })) } },
];
