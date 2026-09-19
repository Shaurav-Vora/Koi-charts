import type { FlowGraph } from "../graph/types";

export const KOI_MIME_TYPE = "application/vnd.koi-chart+json";
export const MAX_KOI_FILE_BYTES = 2 * 1024 * 1024;

export interface KoiProjectV1 {
  format: "koi-chart";
  formatVersion: 1;
  savedAt: string;
  graph: FlowGraph;
}

export type KoiFileErrorCode =
  | "too_large"
  | "invalid_json"
  | "wrong_format"
  | "unsupported_version"
  | "invalid_project";

export const koiFileMessages: Record<KoiFileErrorCode, string> = {
  too_large: "This file is too large to open.",
  invalid_json: "This file could not be read.",
  wrong_format: "This is not a Koi Charts project.",
  unsupported_version: "This Koi project version is not supported.",
  invalid_project: "This Koi project contains an invalid chart.",
};

export class KoiFileError extends Error {
  constructor(readonly code: KoiFileErrorCode) {
    super(koiFileMessages[code]);
    this.name = "KoiFileError";
  }
}
