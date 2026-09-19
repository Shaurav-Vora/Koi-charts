"use client";
import { forwardRef, useCallback, useImperativeHandle, useRef, useState, type ChangeEvent } from "react";
import type { FlowGraph } from "../graph/types";
import { download } from "../visual/raster";
import { koiProjectFilename, parseKoiProject, serializeKoiProject } from "./koi-file";
import { KOI_MIME_TYPE, KoiFileError, MAX_KOI_FILE_BYTES } from "./types";

export type ProjectAction = "save" | "open";
export type ProjectActionResult = { outcome: "committed" | "error"; message: string };
export type ProjectControlsHandle = {
  run(action: ProjectAction): Promise<ProjectActionResult>;
};

type ProjectControlsProps = {
  graph: FlowGraph;
  onImport: (graph: FlowGraph, filename: string) => void | ProjectActionResult;
  onResult: (result: ProjectActionResult) => void;
};

function failure(error: unknown): ProjectActionResult {
  return {
    outcome: "error",
    message: error instanceof Error ? error.message : "This file could not be read.",
  };
}

const ProjectControls = forwardRef<ProjectControlsHandle, ProjectControlsProps>(function ProjectControls(
  { graph, onImport, onResult },
  ref,
) {
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<ProjectAction | null>(null);

  const run = useCallback(async (action: ProjectAction): Promise<ProjectActionResult> => {
    if (action === "open") {
      openButtonRef.current?.focus();
      return { outcome: "committed", message: "Open project ready. Press Enter to choose a Koi file." };
    }

    setBusy("save");
    try {
      const filename = koiProjectFilename();
      const contents = serializeKoiProject(graph);
      download(new Blob([contents], { type: KOI_MIME_TYPE }), filename);
      return { outcome: "committed", message: `Saved ${filename}.` };
    } catch (error) {
      return failure(error);
    } finally {
      setBusy(null);
    }
  }, [graph]);

  useImperativeHandle(ref, () => ({ run }), [run]);

  const chooseProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setBusy("open");
    try {
      if (file.size > MAX_KOI_FILE_BYTES) throw new KoiFileError("too_large");
      let bytes: ArrayBuffer;
      try {
        bytes = await file.arrayBuffer();
      } catch {
        throw new KoiFileError("invalid_json");
      }
      const imported = parseKoiProject(bytes);
      onImport(imported, file.name);
    } catch (error) {
      onResult(failure(error));
    } finally {
      input.value = "";
      setBusy(null);
    }
  };

  return <div className="project-controls">
    <button type="button" disabled={busy !== null} onClick={() => void run("save").then(onResult)}>
      {busy === "save" ? "Saving…" : "Save project"}
    </button>
    <button ref={openButtonRef} type="button" disabled={busy !== null} onClick={() => inputRef.current?.click()}>
      {busy === "open" ? "Opening…" : "Open project"}
    </button>
    <input ref={inputRef} hidden type="file" accept={`.koi,${KOI_MIME_TYPE}`} onChange={event => void chooseProject(event)} />
  </div>;
});

export default ProjectControls;
