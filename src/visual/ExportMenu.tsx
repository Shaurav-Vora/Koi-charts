"use client";
import { useState } from "react";
import type { FlowGraph } from "../graph/types";
import type { LayoutFrame } from "./layout";
import { chartToSvg } from "./export";
import { chartToPdf } from "./pdf";
import { download, exportFilename, svgToRaster } from "./raster";

/**
 * Saving the chart as a picture, for the sighted people the author has to share it with.
 *
 * Four buttons rather than a menu: a menu is another widget to learn and another thing to get
 * wrong with a keyboard, and there are only four. Each one announces what it saved through a
 * live region, because a download is otherwise entirely silent to a screen reader.
 */

const FORMATS = [
  { id: "svg", label: "SVG", hint: "Vector, scales to any size" },
  { id: "png", label: "PNG", hint: "Image with sharp text" },
  { id: "jpeg", label: "JPEG", hint: "Smaller image, for email" },
  { id: "pdf", label: "PDF", hint: "A page, with text that stays text" },
] as const;

export default function ExportMenu({ graph, layout }: { graph: FlowGraph; layout: LayoutFrame }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const empty = !graph.nodes.length;

  async function save(format: typeof FORMATS[number]["id"]) {
    setBusy(format);
    setMessage(`Preparing ${format.toUpperCase()}…`);
    try {
      const name = exportFilename(format);
      if (format === "pdf") {
        const bytes = chartToPdf(graph, layout);
        // A fresh ArrayBuffer copy: the typed array may be a view into a larger buffer, and Blob
        // would then take the whole of it.
        download(new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" }), name);
      } else {
        const svg = chartToSvg(graph, layout);
        if (format === "svg") download(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), name);
        else download(await svgToRaster(svg, format === "png" ? "image/png" : "image/jpeg"), name);
      }
      setMessage(`Saved ${name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The chart could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return <div className="export-controls" role="group" aria-label="Save the chart as a picture">
    {FORMATS.map(format => <button key={format.id} disabled={empty || busy !== null} title={format.hint}
      onClick={() => void save(format.id)}>{busy === format.id ? "Saving…" : format.label}</button>)}
    {/* aria-live without role="status": the voice readout is already the page's status region,
        and a second one competes with it for the same announcement queue. Polite, because
        saving a file is not worth cutting off a reply about the chart itself. */}
    <span className="export-status" data-testid="export-status" aria-live="polite">{empty ? "Add a shape before saving a picture." : message}</span>
  </div>;
}
