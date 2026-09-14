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
  canClear,
  onClear,
  selectionActive,
  onToggleSelection,
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
  canClear?: boolean;
  onClear?: () => void;
  selectionActive?: boolean;
  onToggleSelection?: () => void;
}) {
  return (
    <div className="canvas-controls nodrag nopan" role="toolbar" aria-label="Canvas editing and view">
      {onUndo && onRedo && (
        <>
          <div className="canvas-control-group history-controls" role="group" aria-label="History and chart actions">
            <button type="button" disabled={!canUndo} onClick={onUndo} title="Undo last action (Ctrl+Z)">Undo</button>
            <button type="button" disabled={!canRedo} onClick={onRedo} title="Redo action (Ctrl+Y)">Redo</button>
            {onClear && (
              <button
                type="button"
                className="clear-chart-button"
                disabled={!canClear}
                onClick={onClear}
                title="Clear all nodes from the chart (Undo restores them)"
              >
                Clear chart
              </button>
            )}
          </div>
          <div className="canvas-control-divider" aria-hidden="true" />
        </>
      )}
      {onToggleSelection && (
        <>
          <div className="canvas-control-group selection-controls" role="group" aria-label="Selection tools">
            <button
              type="button"
              className="selection-toggle"
              aria-label="Select multiple shapes"
              aria-pressed={!!selectionActive}
              title={selectionActive ? "Exit multi-select mode" : "Select multiple shapes"}
              onClick={onToggleSelection}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="3" y="3" width="11" height="10" rx="1.5" />
                <path d="m11.5 10.5 5 2.1-2.1 1 1 2.2-1.5.7-1-2.2-1.8 1.5.4-5.3Z" />
              </svg>
            </button>
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
