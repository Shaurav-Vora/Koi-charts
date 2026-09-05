// @vitest-environment node
import { Ajv } from "ajv";
import { describe, expect, it } from "vitest";
import { validCommands } from "../test/fixtures";
import { commandSchema, commandEnvelopeSchema } from "./schema";
import { commandJsonSchema } from "./json-schema";

const validateJson = new Ajv({ strict: true, allErrors: true }).compile(commandJsonSchema);

// Mutate every object boundary independently: omitted required keys and unknown keys must fail.
function invalidVariants(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => invalidVariants(item).map(mutation => value.map((v, i) => i === index ? mutation : v)));
  }
  if (value === null || typeof value !== "object") return [];
  const object = value as Record<string, unknown>;
  return [
    { ...object, unexpected: true },
    ...Object.keys(object).map(key => Object.fromEntries(Object.entries(object).filter(([name]) => name !== key))),
    ...Object.entries(object).flatMap(([key, child]) => invalidVariants(child).map(mutation => ({ ...object, [key]: mutation }))),
  ];
}

describe("command contracts", () => {
  it.each(validCommands)("accepts $name in both validators without transformation", ({ command }) => {
    const before = structuredClone(command);
    expect(commandSchema.parse(command)).toEqual(before);
    expect(commandEnvelopeSchema.parse({ command })).toEqual({ command: before });
    expect(validateJson({ command })).toBe(true);
    expect(command).toEqual(before);
  });
  it.each(validCommands)("rejects extra properties and missing fields at every depth of $name", ({ command }) => {
    for (const mutation of invalidVariants({ command })) {
      expect(commandEnvelopeSchema.safeParse(mutation).success, JSON.stringify(mutation)).toBe(false);
      expect(validateJson(mutation), JSON.stringify(mutation)).toBe(false);
    }
  });
  const invalidCommands: unknown[] = [
    null, [], "undo", 1, {}, { kind: "unknown" }, { kind: "UNDO" },
    { kind: "add_node", type: "image", label: "A", placement: null },
    { kind: "add_node", type: "start", label: "", placement: null },
    { kind: "add_node", type: "start", label: "a".repeat(201), placement: null },
    { kind: "add_node", type: "start", label: "A", placement: { relation: "beside", reference: { kind: "focus" } } },
    { kind: "focus", node: { kind: "id", value: "" } },
    { kind: "focus", node: { kind: "label", value: 123 } },
    { kind: "focus", node: { kind: "last" } }, { kind: "focus", node: null },
    { kind: "describe", scope: "all" }, { kind: "inspect", node: "Begin" },
    { kind: "rename", node: { kind: "focus" }, newLabel: null },
    { kind: "connect", source: { kind: "focus" }, target: { kind: "recent" }, label: "" },
    { kind: "compound", commands: [] },
    { kind: "compound", commands: Array.from({ length: 11 }, () => ({ kind: "rename", node: { kind: "focus" }, newLabel: "A" })) },
    { kind: "compound", commands: [{ kind: "undo" }] },
    { kind: "compound", commands: [{ kind: "inspect", node: null }] },
    { kind: "compound", commands: [{ kind: "compound", commands: [{ kind: "rename", node: { kind: "focus" }, newLabel: "A" }] }] },
  ];
  it.each(invalidCommands.map((command, index) => ({ name: `invalid command ${index + 1}`, command })))("rejects $name in both validators", ({ command }) => {
    expect(commandSchema.safeParse(command).success).toBe(false);
    expect(commandEnvelopeSchema.safeParse({ command }).success).toBe(false);
    expect(validateJson({ command })).toBe(false);
  });
  it.each([1, 200, 201])("agrees on Unicode label length at %i code points", length => {
    const command = { kind: "add_node", type: "process", label: "🐟".repeat(length), placement: null };
    expect(commandSchema.safeParse(command).success).toBe(length <= 200);
    expect(validateJson({ command })).toBe(length <= 200);
  });
  it("leaves whitespace-label rejection to semantic validation, preserving wire input", () => {
    const command = { kind: "rename", node: { kind: "focus" }, newLabel: "   " };
    expect(commandSchema.parse(command)).toEqual(command);
    expect(validateJson({ command })).toBe(true);
  });
});
