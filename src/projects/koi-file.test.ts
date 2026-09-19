// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FlowGraph } from "../graph/types";
import {
  MAX_KOI_FILE_BYTES,
  KoiFileError,
  koiFileMessages,
  type KoiFileErrorCode,
} from "./types";
import {
  koiProjectFilename,
  parseKoiProject,
  serializeKoiProject,
} from "./koi-file";

const graph: FlowGraph = {
  schemaVersion: 1,
  nodes: [
    { id: "start", type: "start", label: "Begin", position: { x: 10, y: 20 } },
    {
      id: "review",
      type: "process",
      label: "Review",
      placement: { relation: "right_of", referenceNodeId: "start" },
    },
  ],
  edges: [{ id: "edge", source: "start", target: "review", label: "next" }],
};

function bytes(text: string): ArrayBuffer {
  const value = new TextEncoder().encode(text);
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    format: "koi-chart",
    formatVersion: 1,
    savedAt: "2026-09-19T12:00:00.000Z",
    graph,
    ...overrides,
  };
}

function expectFileError(input: ArrayBuffer, code: KoiFileErrorCode) {
  try {
    parseKoiProject(input);
    throw new Error("Expected the Koi file to be rejected.");
  } catch (error) {
    expect(error).toBeInstanceOf(KoiFileError);
    expect(error).toMatchObject({ code, message: koiFileMessages[code] });
  }
}

describe("editable Koi project files", () => {
  it("round-trips every editable graph field in a strict versioned envelope", () => {
    const before = structuredClone(graph);
    const text = serializeKoiProject(graph, new Date("2026-09-19T12:00:00.000Z"));

    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text)).toEqual(envelope());
    expect(graph).toEqual(before);

    const restored = parseKoiProject(bytes(text));
    expect(restored).toEqual(graph);
    expect(restored).not.toBe(graph);
    expect(restored.nodes).not.toBe(graph.nodes);
    expect(restored.edges).not.toBe(graph.edges);
  });

  it("returns independent graphs on repeated reads", () => {
    const encoded = bytes(JSON.stringify(envelope()));
    const first = parseKoiProject(encoded);
    const second = parseKoiProject(encoded);

    first.nodes[0].label = "Changed";
    expect(second.nodes[0].label).toBe("Begin");
  });

  it("uses a stable second-precision Koi filename", () => {
    expect(koiProjectFilename(new Date("2026-09-19T14:30:25.000Z")))
      .toBe("koi-chart-2026-09-19-143025.koi");
  });

  it("rejects files over two MiB before decoding", () => {
    expectFileError(new ArrayBuffer(MAX_KOI_FILE_BYTES + 1), "too_large");
  });

  it("rejects invalid UTF-8 and malformed JSON as unreadable", () => {
    expectFileError(new Uint8Array([0xff]).buffer, "invalid_json");
    expectFileError(bytes("{"), "invalid_json");
  });

  it("distinguishes non-Koi files and unsupported versions", () => {
    expectFileError(bytes(JSON.stringify({ hello: "world" })), "wrong_format");
    expectFileError(bytes(JSON.stringify(envelope({ format: "another-app" }))), "wrong_format");
    expectFileError(bytes(JSON.stringify(envelope({ formatVersion: 2 }))), "unsupported_version");
  });

  it.each([
    ["extra envelope field", envelope({ preview: true })],
    ["non-normalized timestamp", envelope({ savedAt: "2026-09-19T12:00:00Z" })],
    ["invalid timestamp", envelope({ savedAt: "yesterday" })],
    ["duplicate node IDs", envelope({ graph: {
      schemaVersion: 1,
      nodes: [
        { id: "same", type: "start", label: "One" },
        { id: "same", type: "end", label: "Two" },
      ],
      edges: [],
    } })],
    ["missing edge endpoint", envelope({ graph: {
      schemaVersion: 1,
      nodes: [{ id: "start", type: "start", label: "Begin" }],
      edges: [{ id: "edge", source: "start", target: "missing" }],
    } })],
    ["self-edge", envelope({ graph: {
      schemaVersion: 1,
      nodes: [{ id: "start", type: "start", label: "Begin" }],
      edges: [{ id: "edge", source: "start", target: "start" }],
    } })],
  ])("rejects %s as an invalid project", (_, value) => {
    expectFileError(bytes(JSON.stringify(value)), "invalid_project");
  });
});
