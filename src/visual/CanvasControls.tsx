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
  compactActive,
  onToggleCompact,
  canArrange,
  onArrange,
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
  compactActive?: boolean;
  onToggleCompact?: () => void;
  canArrange?: boolean;
  onArrange?: () => void;
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
      {onToggleCompact && (
        <>
          <div className="canvas-control-group compact-controls" role="group" aria-label="Node view">
            <button
              type="button"
              className="compact-toggle"
              aria-label="Use compact nodes"
              aria-pressed={!!compactActive}
              title={compactActive ? "Use standard nodes" : "Use compact nodes"}
              onClick={onToggleCompact}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="3" y="4" width="6" height="5" rx="1" />
                <rect x="11" y="4" width="6" height="5" rx="1" />
                <rect x="7" y="12" width="6" height="4" rx="1" />
                <path d="M6 9v1.5h8V9M10 10.5V12" />
              </svg>
            </button>
          </div>
          <div className="canvas-control-divider" aria-hidden="true" />
        </>
      )}
      {onArrange && (
        <>
          <div className="canvas-control-group arrange-controls" role="group" aria-label="Layout tools">
            <button
              type="button"
              className="arrange-button"
              aria-label="Auto arrange chart"
              disabled={!canArrange}
              title="Arrange shapes from top to bottom"
              onClick={onArrange}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <rect x="6" y="2.5" width="8" height="4" rx="1" />
                <rect x="6" y="13.5" width="8" height="4" rx="1" />
                <path d="M10 6.5v7m-2-2 2 2 2-2" />
              </svg>
            </button>
          </div>
          <div className="canvas-control-divider" aria-hidden="true" />
        </>
      )}
      <div className="canvas-control-group zoom-controls" role="group" aria-label="Zoom controls">
        <button type="button" onClick={onZoomIn} title="Zoom in">Zoom in</button>
        <button type="button" onClick={onZoomOut} title="Zoom out">Zoom out</button>
        <button type="button" disabled={!canFit} onClick={onFit} title="Frame chart at a readable scale">Fit chart</button>
        <button type="button" disabled={!canCenter} onClick={onCenter} title="Center selection">Center selection</button>
      </div>
    </div>
  );
}
