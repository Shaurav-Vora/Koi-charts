/**
 * PNG and JPEG, rendered from the SVG the app already produces rather than from the page.
 *
 * The browser is the rasteriser: an SVG loaded into an Image and painted onto a canvas is drawn
 * by the same engine that drew the chart, so the picture matches. Everything vector lives in
 * export.ts and pdf.ts, which run under Node and are tested there; only this file needs a DOM.
 */

/** Two device pixels per chart pixel: a flowchart is mostly text, and text at 1× prints soft. */
export const SCALE = 2;

export type RasterType = "image/png" | "image/jpeg";

export async function svgToRaster(svg: string, type: RasterType, scale = SCALE): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await load(url);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot draw to a canvas, so images cannot be saved.");
    // JPEG has no transparency, and an unpainted canvas is transparent black, which would come
    // out as a solid black page. Painting white first costs nothing and covers both formats.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await toBlob(canvas, type);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The chart image could not be rendered."));
    image.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: RasterType): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // 0.92 is the browsers' own default JPEG quality; it is ignored for PNG.
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("The image could not be encoded."))), type, 0.92);
  });
}

/**
 * Hands a file to the browser's downloader. Revoking on the next frame rather than immediately
 * matters in Firefox, which reads the URL after the click returns.
 */
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** A filename an author can find again: the chart's own name, dated, with no spaces to quote. */
export function exportFilename(extension: string, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
  return `koi-chart-${stamp}.${extension}`;
}
