"use client";

/**
 * The canvas view and history controls. Positioned inside the chart area.
 */
export default function CanvasControls({
  canFit,
  canCenter,
  onZoomIn,
  onZoomOut,
  onFit,
  onCenter,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  canFit: boolean;
  canCenter: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onCenter: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  return (
    <div className="canvas-controls nodrag nopan" role="toolbar" aria-label="Canvas editing and view">
      {onUndo && onRedo && (
        <>
          <div className="canvas-control-group history-controls" role="group" aria-label="History">
            <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo last action">Undo</button>
            <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo action">Redo</button>
          </div>
          <div className="canvas-control-divider" aria-hidden="true" />
        </>
      )}
      <div className="canvas-control-group zoom-controls" role="group" aria-label="Zoom controls">
        <button type="button" onClick={onZoomIn} title="Zoom in">Zoom in</button>
        <button type="button" onClick={onZoomOut} title="Zoom out">Zoom out</button>
        <button type="button" disabled={!canFit} onClick={onFit} title="Fit chart into view">Fit chart</button>
        <button type="button" disabled={!canCenter} onClick={onCenter} title="Center selection">Center selection</button>
      </div>
    </div>
  );
}
