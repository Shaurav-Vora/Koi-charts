import type { FlowGraph, FlowNode } from "../graph/types";
import type { LayoutFrame, LayoutNode } from "./layout";

/**
 * The chart as a picture, drawn from the same layout the canvas uses rather than scraped out of
 * the page. The canvas is React Flow: HTML boxes positioned over a pane, with handles, hover
 * states and a viewport transform. Copying that DOM would export whatever happened to be on
 * screen — the current zoom, a hover ring, a half-open editor. Drawing from the layout gives the
 * whole chart at its true size, the same every time, and can be tested without a browser.
 */

export const MARGIN = 32;
const INK = "#1c2c49", LINE = "#637796", MUTED = "#53627a", PAPER = "#ffffff";
const LABEL_SIZE = 15, KIND_SIZE = 11, EDGE_SIZE = 12;

export type Drawing = {
  width: number; height: number;
  nodes: { node: FlowNode; box: LayoutNode; lines: string[] }[];
  edges: { points: { x: number; y: number }[]; label: string | null; at: { x: number; y: number } }[];
};

/** Helvetica's average advance is close enough to place a label; nothing here needs kerning. */
const textWidth = (text: string, size: number) => text.length * size * 0.52;

/** Wraps a label to the width of its shape. A word wider than the shape is left to overhang. */
export function wrapLabel(label: string, width: number, size = LABEL_SIZE): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (textWidth(`${current} ${word}`, size) <= width) current = `${current} ${word}`;
    else { lines.push(current); current = word; }
  }
  lines.push(current);
  // Three lines is what a shape holds; the rest is elided rather than drawn over its own border.
  return lines.length <= 3 ? lines : [...lines.slice(0, 2), `${lines[2]}…`];
}

/** Everything both the SVG and the PDF need, in one pass, so the two cannot drift apart. */
export function planDrawing(graph: FlowGraph, layout: LayoutFrame): Drawing {
  const boxes = new Map(layout.nodes.map(box => [box.id, box]));
  const nodes = graph.nodes.flatMap(node => {
    const box = boxes.get(node.id);
    return box ? [{ node, box, lines: wrapLabel(node.label, box.width - (node.type === "decision" ? 84 : 28)) }] : [];
  });
  const edges = layout.edges.flatMap(edge => {
    const label = graph.edges.find(item => item.id === edge.id)?.label ?? null;
    const middle = edge.points[Math.floor(edge.points.length / 2)] ?? { x: 0, y: 0 };
    return edge.points.length ? [{ points: edge.points, label, at: middle }] : [];
  });
  // Translate complete drawing bounds, including negative positions and label overhang.
  const bounds = [
    ...nodes.map(({ box, lines }) => {
      const halfText = Math.max(...lines.map(line => line.length * LABEL_SIZE)) / 2;
      return { left: Math.min(box.x, box.x + box.width / 2 - halfText), top: box.y,
        right: Math.max(box.x + box.width, box.x + box.width / 2 + halfText), bottom: box.y + box.height };
    }),
    ...edges.flatMap(edge => [
      ...edge.points.map(point => ({ left: point.x, right: point.x, top: point.y, bottom: point.y })),
      ...(edge.label ? [{ left: edge.at.x - edge.label.length * EDGE_SIZE / 2 - 5, right: edge.at.x + edge.label.length * EDGE_SIZE / 2 + 5, top: edge.at.y - 9, bottom: edge.at.y + 9 }] : []),
    ]),
  ];
  const left = bounds.length ? Math.min(...bounds.map(box => box.left)) : 0;
  const top = bounds.length ? Math.min(...bounds.map(box => box.top)) : 0;
  const right = bounds.length ? Math.max(...bounds.map(box => box.right)) : 0;
  const bottom = bounds.length ? Math.max(...bounds.map(box => box.bottom)) : 0;
  const translate = (point: { x: number; y: number }) => ({ x: point.x + MARGIN - left, y: point.y + MARGIN - top });
  return { width: Math.ceil(right - left + MARGIN * 2), height: Math.ceil(bottom - top + MARGIN * 2),
    nodes: nodes.map(item => ({ ...item, box: { ...item.box, ...translate(item.box) } })),
    edges: edges.map(edge => ({ ...edge, points: edge.points.map(translate), at: translate(edge.at) })),
  };
}

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shape(node: FlowNode, box: LayoutNode): string {
  const attributes = `fill="${PAPER}" stroke="${LINE}" stroke-width="2"`;
  if (node.type === "decision") {
    const points = [[box.x + box.width / 2, box.y], [box.x + box.width, box.y + box.height / 2],
      [box.x + box.width / 2, box.y + box.height], [box.x, box.y + box.height / 2]];
    return `<polygon points="${points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ")}" ${attributes} />`;
  }
  // A start or an end is a stadium; a process is a rounded rectangle. The radii match the canvas.
  const radius = node.type === "process" ? 5 : box.height / 2;
  return `<rect x="${round(box.x)}" y="${round(box.y)}" width="${box.width}" height="${box.height}" rx="${radius}" ${attributes} />`;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * A standalone SVG: no CSS variables, no external font, nothing that only resolves inside this
 * app. It has to survive being opened on its own, mailed to someone, or placed in a document.
 */
export function chartToSvg(graph: FlowGraph, layout: LayoutFrame, title = "Koi charts flowchart"): string {
  const plan = planDrawing(graph, layout);
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}" role="img" aria-labelledby="chart-title">`);
  // The description is the chart in words, so an SVG opened away from this app still says what
  // it shows to anyone reading it with a screen reader.
  parts.push(`<title id="chart-title">${escape(title)}</title><desc>${escape(describe(graph))}</desc>`);
  parts.push(`<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${LINE}" /></marker></defs>`);
  parts.push(`<rect width="${plan.width}" height="${plan.height}" fill="${PAPER}" />`);
  for (const edge of plan.edges) {
    parts.push(`<polyline points="${edge.points.map(point => `${round(point.x)},${round(point.y)}`).join(" ")}" fill="none" stroke="${LINE}" stroke-width="2" marker-end="url(#arrow)" />`);
    if (edge.label) {
      const width = textWidth(edge.label, EDGE_SIZE) + 10;
      parts.push(`<rect x="${round(edge.at.x - width / 2)}" y="${round(edge.at.y - 9)}" width="${round(width)}" height="18" rx="4" fill="${PAPER}" stroke="${LINE}" stroke-width="1" />`);
      parts.push(`<text x="${round(edge.at.x)}" y="${round(edge.at.y + 4)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${EDGE_SIZE}" fill="${MUTED}">${escape(edge.label)}</text>`);
    }
  }
  for (const { node, box, lines } of plan.nodes) {
    parts.push(shape(node, box));
    const centre = box.x + box.width / 2;
    const first = box.y + box.height / 2 - (lines.length - 1) * LABEL_SIZE * 0.6 + 4;
    parts.push(`<text x="${round(centre)}" y="${round(box.y + box.height / 2 - (lines.length - 1) * LABEL_SIZE * 0.6 - 14)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${KIND_SIZE}" fill="${MUTED}" letter-spacing="0.6">${escape(node.type.toUpperCase())}</text>`);
    lines.forEach((line, index) => parts.push(`<text x="${round(centre)}" y="${round(first + index * LABEL_SIZE * 1.2)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${LABEL_SIZE}" font-weight="600" fill="${INK}">${escape(line)}</text>`));
  }
  parts.push("</svg>");
  return parts.join("\n");
}

function describe(graph: FlowGraph): string {
  if (!graph.nodes.length) return "An empty flowchart.";
  const shapes = graph.nodes.map(node => `${node.label} (${node.type})`).join(", ");
  const label = (id: string) => graph.nodes.find(node => node.id === id)?.label ?? id;
  const arrows = graph.edges.map(edge => `${label(edge.source)} to ${label(edge.target)}${edge.label ? `, labelled ${edge.label}` : ""}`).join("; ");
  return `A flowchart of ${graph.nodes.length} shapes: ${shapes}.${arrows ? ` Connections: ${arrows}.` : ""}`;
}
