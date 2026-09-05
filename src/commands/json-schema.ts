// Provider-facing envelope. Keep acceptance contract-tested against schema.ts.
const obj = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});
const str = { type: "string", minLength: 1, maxLength: 200 };
const en = (...values: string[]) => ({ type: "string", enum: values });
const nullable = (schema: unknown) => ({ anyOf: [schema, { type: "null" }] });
const variant = (kind: string, fields: Record<string, unknown> = {}) =>
  obj({ kind: { const: kind, type: "string" }, ...fields });
const ref = { anyOf: [variant("id", { value: str }), variant("label", { value: str }),
  variant("focus"), variant("recent")] };
const placement = obj({
  relation: en("before", "after", "above", "below", "left_of", "right_of"), reference: ref,
});
const target = { anyOf: [variant("node", { node: ref }), variant("edge_id", { id: str }),
  variant("edge", { source: ref, target: ref, label: nullable(str) })] };
const edits = [
  variant("add_node", { type: en("start", "process", "decision", "end"), label: str, placement: nullable(placement) }),
  variant("connect", { source: ref, target: ref, label: nullable(str) }),
  variant("rename", { node: ref, newLabel: str }),
  variant("move", { node: ref, placement }), variant("delete", { target }),
];
export const commandJsonSchema = obj({ command: { anyOf: [
  ...edits,
  variant("compound", { commands: { type: "array", minItems: 1, maxItems: 10, items: { anyOf: edits } } }),
  variant("focus", { node: ref }),
  ...["undo", "redo", "validate", "confirm", "cancel"].map(kind => variant(kind)),
  variant("describe", { scope: en("chart", "focus") }),
  variant("inspect", { node: nullable(ref) }),
  variant("trace_path", { start: ref, end: nullable(ref) }),
] } });
