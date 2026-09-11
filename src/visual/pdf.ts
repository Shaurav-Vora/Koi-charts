import type { FlowGraph } from "../graph/types";
import type { LayoutFrame } from "./layout";
import { planDrawing } from "./export";

/**
 * A PDF of the chart, written out here rather than rasterised from the picture on screen.
 *
 * The point is that the text stays text: a printed flowchart is usually read by someone else, and
 * a vector page can be searched, selected, read aloud by a PDF reader and enlarged without going
 * soft. Helvetica is one of the fourteen fonts every reader is required to have, so nothing has
 * to be embedded and the file stays a few kilobytes.
 */

const INK = "0.11 0.17 0.29", LINE = "0.39 0.47 0.59", MUTED = "0.33 0.38 0.48";
const LABEL_SIZE = 15, KIND_SIZE = 11, EDGE_SIZE = 12;
const width = (text: string, size: number) => text.length * size * 0.52;

/** PDF strings are parenthesised, so the two brackets and the escape character must be escaped. */
const literal = (text: string) => `(${[...text].map(character => {
  if (character === "(" || character === ")" || character === "\\") return `\\${character}`;
  const code = character.codePointAt(0)!;
  // WinAnsiEncoding covers the Latin-1 range; anything beyond it would print as a wrong glyph.
  return code >= 32 && code <= 255 ? character : "?";
}).join("")})`;

export function chartToPdf(graph: FlowGraph, layout: LayoutFrame, title = "Koi charts flowchart"): Uint8Array {
  const plan = planDrawing(graph, layout);
  const flip = (y: number) => round(plan.height - y);
  const out: string[] = ["1 w", "1 1 1 rg", `0 0 ${round(plan.width)} ${round(plan.height)} re f`];
  const text = (value: string, x: number, y: number, size: number, colour: string, bold = false) => {
    out.push("BT", `/${bold ? "F2" : "F1"} ${size} Tf`, `${colour} rg`,
      `1 0 0 1 ${round(x - width(value, size) / 2)} ${flip(y)} Tm`, `${literal(value)} Tj`, "ET");
  };

  out.push(`${LINE} RG`, "2 w");
  for (const edge of plan.edges) {
    const [first, ...rest] = edge.points;
    out.push(`${round(first.x)} ${flip(first.y)} m`, ...rest.map(point => `${round(point.x)} ${flip(point.y)} l`), "S");
    out.push(...arrowhead(edge.points, flip));
  }
  for (const edge of plan.edges) {
    if (!edge.label) continue;
    const boxWidth = width(edge.label, EDGE_SIZE) + 10;
    out.push("1 1 1 rg", "1 w", `${round(edge.at.x - boxWidth / 2)} ${flip(edge.at.y + 9)} ${round(boxWidth)} 18 re B`, "2 w");
    text(edge.label, edge.at.x, edge.at.y + 4, EDGE_SIZE, MUTED);
  }
  for (const { node, box, lines } of plan.nodes) {
    out.push("1 1 1 rg", `${LINE} RG`, "2 w");
    out.push(node.type === "decision"
      ? path([[box.x + box.width / 2, box.y], [box.x + box.width, box.y + box.height / 2], [box.x + box.width / 2, box.y + box.height], [box.x, box.y + box.height / 2]], flip)
      : rounded(box.x, box.y, box.width, box.height, node.type === "process" ? 5 : box.height / 2, flip));
    const centre = box.x + box.width / 2;
    const top = box.y + box.height / 2 - (lines.length - 1) * LABEL_SIZE * 0.6;
    text(node.type.toUpperCase(), centre, top - 14, KIND_SIZE, MUTED);
    lines.forEach((line, index) => text(line, centre, top + 4 + index * LABEL_SIZE * 1.2, LABEL_SIZE, INK, true));
  }

  const stream = out.join("\n");
  return assemble(stream, plan.width, plan.height, title);
}

const round = (value: number) => Math.round(value * 100) / 100;

function path(points: number[][], flip: (y: number) => number): string {
  const [first, ...rest] = points;
  return [`${round(first[0])} ${flip(first[1])} m`, ...rest.map(([x, y]) => `${round(x)} ${flip(y)} l`), "h B"].join("\n");
}

/** A rounded rectangle needs curves: PDF has no corner radius of its own. */
function rounded(x: number, y: number, w: number, h: number, r: number, flip: (value: number) => number): string {
  // 0.5523 is the circle-to-bezier constant: the control-point distance that makes a cubic curve
  // match a quarter circle to within a fraction of a point, which is why every drawing library
  // draws round corners this way rather than with an arc primitive PDF does not have.
  const radius = Math.min(r, w / 2, h / 2), k = radius * 0.5523;
  const left = round(x), right = round(x + w), top = flip(y), bottom = flip(y + h);
  const at = (value: number) => round(value);
  return [
    `${at(x + radius)} ${bottom} m`,
    `${at(x + w - radius)} ${bottom} l`,
    `${at(x + w - radius + k)} ${bottom} ${right} ${at(bottom + radius - k)} ${right} ${at(bottom + radius)} c`,
    `${right} ${at(top - radius)} l`,
    `${right} ${at(top - radius + k)} ${at(x + w - radius + k)} ${top} ${at(x + w - radius)} ${top} c`,
    `${at(x + radius)} ${top} l`,
    `${at(x + radius - k)} ${top} ${left} ${at(top - radius + k)} ${left} ${at(top - radius)} c`,
    `${left} ${at(bottom + radius)} l`,
    `${left} ${at(bottom + radius - k)} ${at(x + radius - k)} ${bottom} ${at(x + radius)} ${bottom} c`,
    "h B",
  ].join("\n");
}

/** A filled triangle at the far end, pointing the way the last segment travels. */
function arrowhead(points: { x: number; y: number }[], flip: (y: number) => number): string[] {
  const end = points[points.length - 1], before = points[points.length - 2] ?? end;
  const dx = end.x - before.x, dy = end.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length, uy = dy / length, size = 9;
  const back = { x: end.x - ux * size, y: end.y - uy * size };
  const wing = { x: (-uy * size) / 2.6, y: (ux * size) / 2.6 };
  return [`${LINE} rg`,
    `${round(end.x)} ${flip(end.y)} m`,
    `${round(back.x + wing.x)} ${flip(back.y + wing.y)} l`,
    `${round(back.x - wing.x)} ${flip(back.y - wing.y)} l`,
    "h f"];
}

/** The object table and trailer. Byte offsets must be exact or no reader will open the file. */
function assemble(stream: string, pageWidth: number, pageHeight: number, title: string): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${round(pageWidth)} ${round(pageHeight)}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Title ${literal(title)} /Producer (Koi charts) >>`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const startxref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${objects.length} 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;
  // Latin-1: every byte written above is one character, which is what the offsets counted.
  return Uint8Array.from([...body].map(character => character.charCodeAt(0) & 0xff));
}
