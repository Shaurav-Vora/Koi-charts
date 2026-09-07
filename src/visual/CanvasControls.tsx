"use client";

/**
 * The canvas view controls. These change what is on screen, never the chart, so they issue no
 * command, push no history entry and speak no reply: an author working by voice is unaffected
 * by them, and an author working by sight can reach them without hunting for a 26px icon.
 */
export default function CanvasControls({ canFit, canCenter, onZoomIn, onZoomOut, onFit, onCenter }: {
 canFit: boolean; canCenter: boolean; onZoomIn: () => void; onZoomOut: () => void; onFit: () => void; onCenter: () => void;
}) {
 return <div className="canvas-controls nodrag nopan" role="group" aria-label="Canvas view">
  <button type="button" onClick={onZoomIn}>Zoom in</button>
  <button type="button" onClick={onZoomOut}>Zoom out</button>
  <button type="button" disabled={!canFit} onClick={onFit}>Fit chart</button>
  <button type="button" disabled={!canCenter} onClick={onCenter}>Center selection</button>
 </div>;
}
