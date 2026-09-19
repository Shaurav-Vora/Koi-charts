import { z } from "zod";
import { assertGraph } from "../graph/invariants";
import type { FlowGraph } from "../graph/types";
import {
  KoiFileError,
  MAX_KOI_FILE_BYTES,
  type KoiProjectV1,
} from "./types";

const normalizedTimestamp = z.string().refine(value => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
});

const projectSchema = z.strictObject({
  format: z.literal("koi-chart"),
  formatVersion: z.literal(1),
  savedAt: normalizedTimestamp,
  graph: z.unknown(),
});

function invalidProject(error: unknown): never {
  if (error instanceof KoiFileError) throw error;
  throw new KoiFileError("invalid_project");
}

export function serializeKoiProject(graph: FlowGraph, now = new Date()): string {
  try {
    assertGraph(graph);
    const project: KoiProjectV1 = {
      format: "koi-chart",
      formatVersion: 1,
      savedAt: now.toISOString(),
      graph: structuredClone(graph),
    };
    return `${JSON.stringify(project, null, 2)}\n`;
  } catch (error) {
    return invalidProject(error);
  }
}

export function parseKoiProject(bytes: ArrayBuffer): FlowGraph {
  if (bytes.byteLength > MAX_KOI_FILE_BYTES) throw new KoiFileError("too_large");

  let raw: unknown;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
    raw = JSON.parse(text);
  } catch {
    throw new KoiFileError("invalid_json");
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new KoiFileError("wrong_format");
  }

  const record = raw as Record<string, unknown>;
  if (record.format !== "koi-chart") throw new KoiFileError("wrong_format");
  if (record.formatVersion !== 1) throw new KoiFileError("unsupported_version");

  try {
    const project = projectSchema.parse(raw);
    assertGraph(project.graph);
    return structuredClone(project.graph);
  } catch (error) {
    return invalidProject(error);
  }
}

export function koiProjectFilename(now = new Date()): string {
  const timestamp = now.toISOString();
  const date = timestamp.slice(0, 10);
  const time = timestamp.slice(11, 19).replaceAll(":", "");
  return `koi-chart-${date}-${time}.koi`;
}
