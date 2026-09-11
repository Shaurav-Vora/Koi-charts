// @vitest-environment node
import { describe, expect, it } from "vitest";
import { graphFixture } from "../test/fixtures";
import type { FlowGraph } from "../graph/types";
import { layoutGraph } from "./layout";
import { chartToSvg, planDrawing, wrapLabel, MARGIN } from "./export";
import { chartToPdf } from "./pdf";
import { exportFilename } from "./raster";

const empty: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };
const laid = () => { const graph = graphFixture(); return { graph, layout: layoutGraph(graph) }; };

describe("wrapping a label to its shape", () => {
  it("keeps a short label on one line", () => expect(wrapLabel("Begin", 162)).toEqual(["Begin"]));
  it("breaks between words rather than inside them", () => {
    const lines = wrapLabel("Check the card before payment", 162);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(" ")).toBe("Check the card before payment");
  });
  it("elides past three lines, so a long label cannot overflow its shape", () => {
    const lines = wrapLabel("one two three four five six seven eight nine ten eleven twelve", 60);
    expect(lines).toHaveLength(3);
    expect(lines[2].endsWith("…")).toBe(true);
  });
  it("survives an empty label", () => expect(wrapLabel("", 162)).toEqual([""]));
});

describe("planning the drawing", () => {
  it("keeps negative-position nodes and routes inside every export without mutating the layout", () => {
    const { graph, layout } = laid();
    const shifted = { nodes: layout.nodes.map(box => ({...box,x:box.x-700,y:box.y-500})),
      edges: layout.edges.map(edge => ({...edge,points:edge.points.map(p=>({x:p.x-700,y:p.y-500}))})) };
    const before = structuredClone(shifted);
    const plan = planDrawing(graph, shifted);
    for (const {box} of plan.nodes) {
      expect(box.x).toBeGreaterThanOrEqual(MARGIN);
      expect(box.y).toBeGreaterThanOrEqual(MARGIN);
      expect(box.x+box.width).toBeLessThanOrEqual(plan.width-MARGIN);
      expect(box.y+box.height).toBeLessThanOrEqual(plan.height-MARGIN);
    }
    for (const edge of plan.edges) for(const p of edge.points) {
      expect(p.x).toBeGreaterThanOrEqual(MARGIN);
      expect(p.y).toBeGreaterThanOrEqual(MARGIN);
      expect(p.x).toBeLessThanOrEqual(plan.width-MARGIN);
      expect(p.y).toBeLessThanOrEqual(plan.height-MARGIN);
    }
    expect(planDrawing(graph, layout)).toEqual(plan);
    expect(shifted).toEqual(before);
    expect(chartToSvg(graph,shifted)).toBe(chartToSvg(graph,layout));
    expect(chartToPdf(graph,shifted)).toEqual(chartToPdf(graph,layout));
  });
  it("covers every shape and connection, with a margin around them", () => {
    const { graph, layout } = laid();
    const plan = planDrawing(graph, layout);
    expect(plan.nodes).toHaveLength(4);
    expect(plan.edges).toHaveLength(3);
    const right = Math.max(...plan.nodes.map(({ box }) => box.x + box.width));
    expect(plan.width).toBeGreaterThanOrEqual(right + MARGIN);
    expect(plan.nodes.every(({ box }) => box.x + box.width <= plan.width && box.y + box.height <= plan.height)).toBe(true);
  });
  it("carries the connection labels through", () => {
    const { graph, layout } = laid();
    expect(planDrawing(graph, layout).edges.map(edge => edge.label)).toContain("yes");
  });
});

describe("SVG", () => {
  it("is standalone: its own namespace, its own background, no app styling", () => {
    const { graph, layout } = laid();
    const svg = chartToSvg(graph, layout);
    expect(svg.startsWith("<svg xmlns=\"http://www.w3.org/2000/svg\"")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    // A var() would resolve to nothing outside the app, leaving an invisible chart in a file
    // the author has already emailed to someone.
    expect(svg).not.toContain("var(--");
  });
  it("says what it shows, for anyone opening the file with a screen reader", () => {
    const { graph, layout } = laid();
    const svg = chartToSvg(graph, layout);
    expect(svg).toContain("role=\"img\"");
    expect(svg).toMatch(/<desc>A flowchart of 4 shapes/);
    expect(svg).toContain("Payment approved");
  });
  it("escapes a label that would otherwise close a tag", () => {
    const graph: FlowGraph = { schemaVersion: 1, nodes: [{ id: "a", type: "process", label: "a < b & \"c\"" }], edges: [] };
    const svg = chartToSvg(graph, layoutGraph(graph));
    expect(svg).toContain("a &lt; b &amp;");
    expect(svg).not.toMatch(/>a < b/);
  });
  it("draws an empty chart as a blank page rather than throwing", () => {
    expect(() => chartToSvg(empty, layoutGraph(empty))).not.toThrow();
    expect(chartToSvg(empty, layoutGraph(empty))).toContain("An empty flowchart.");
  });
});

describe("PDF", () => {
  const bytes = () => { const { graph, layout } = laid(); return chartToPdf(graph, layout); };
  const text = (data: Uint8Array) => String.fromCharCode(...data);

  it("is a PDF a reader will open", () => {
    const body = text(bytes());
    expect(body.startsWith("%PDF-1.4")).toBe(true);
    expect(body.trimEnd().endsWith("%%EOF")).toBe(true);
  });
  it("keeps the labels as real text, not a picture of text", () => {
    // The whole reason for writing the PDF by hand: a rasterised page cannot be searched,
    // selected, or read out by the reader the recipient already uses.
    const body = text(bytes());
    expect(body).toContain("/BaseFont /Helvetica");
    expect(body).toContain("(Payment approved) Tj");
  });
  it("gives every object an accurate byte offset, or no reader will open it", () => {
    const body = text(bytes());
    const start = Number(/startxref\s+(\d+)/.exec(body)![1]);
    expect(body.slice(start, start + 4)).toBe("xref");
    const offsets = [...body.matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
    expect(offsets).toHaveLength(7);
    offsets.forEach((offset, index) => expect(body.slice(offset, offset + 8)).toContain(`${index + 1} 0 obj`));
  });
  it("escapes a label containing brackets, which would end the string early", () => {
    const graph: FlowGraph = { schemaVersion: 1, nodes: [{ id: "a", type: "process", label: "Process (3)" }], edges: [] };
    const body = text(chartToPdf(graph, layoutGraph(graph)));
    expect(body).toContain("(Process \\(3\\)) Tj");
  });
  it("writes single bytes only, so the offsets it counted are the bytes on disk", () => {
    expect(bytes().every(byte => byte <= 255)).toBe(true);
  });
});

describe("filenames", () => {
  it("dates the file and avoids characters that need quoting", () => {
    const name = exportFilename("png", new Date("2026-09-08T11:32:00Z"));
    expect(name).toBe("koi-chart-2026-09-08-1132.png");
    expect(name).not.toMatch(/[\s:]/);
  });
});
