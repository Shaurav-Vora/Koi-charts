import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CanvasControls from "./CanvasControls";

const handlers = () => ({ onZoomIn: vi.fn(), onZoomOut: vi.fn(), onFit: vi.fn(), onCenter: vi.fn() });

it("runs each view action without touching the chart itself", () => {
 const h = handlers();
 render(<CanvasControls canFit canCenter {...h} />);
 for (const [name, handler] of [["Zoom in", h.onZoomIn], ["Zoom out", h.onZoomOut], ["Fit chart", h.onFit], ["Center selection", h.onCenter]] as const) {
  fireEvent.click(screen.getByRole("button", { name: name as string }));
  expect(handler).toHaveBeenCalledTimes(1);
 }
});
// Fitting nothing and centring nothing both look like a broken button, so say so up front.
it("offers fitting and centring only when there is something to look at", () => {
 render(<CanvasControls canFit={false} canCenter={false} {...handlers()} />);
 expect(screen.getByRole("button", { name: "Fit chart" })).toBeDisabled();
 expect(screen.getByRole("button", { name: "Center selection" })).toBeDisabled();
 expect(screen.getByRole("button", { name: "Zoom in" })).toBeEnabled();
});

it("exposes multi-selection as a pressed-state toolbar toggle", () => {
 const onToggleSelection = vi.fn();
 const { rerender } = render(<CanvasControls canFit canCenter selectionActive={false} onToggleSelection={onToggleSelection} {...handlers()} />);
 const toggle = screen.getByRole("button", { name: "Select multiple shapes" });
 expect(toggle).toHaveAttribute("aria-pressed", "false");
 fireEvent.click(toggle);
 expect(onToggleSelection).toHaveBeenCalledTimes(1);
 rerender(<CanvasControls canFit canCenter selectionActive onToggleSelection={onToggleSelection} {...handlers()} />);
 expect(screen.getByRole("button", { name: "Select multiple shapes" })).toHaveAttribute("aria-pressed", "true");
});

it("exposes compact nodes as a separate icon toggle", () => {
 const onToggleCompact = vi.fn();
 render(<CanvasControls canFit canCenter compactActive={false} onToggleCompact={onToggleCompact} {...handlers()} />);
 const toggle = screen.getByRole("button", { name: "Use compact nodes" });
 expect(toggle).toHaveAttribute("aria-pressed", "false");
 fireEvent.click(toggle);
 expect(onToggleCompact).toHaveBeenCalledTimes(1);
});

it("offers one-click automatic arrangement", () => {
 const onArrange = vi.fn();
 render(<CanvasControls canFit canCenter canArrange onArrange={onArrange} {...handlers()} />);
 fireEvent.click(screen.getByRole("button", { name: "Auto arrange chart" }));
 expect(onArrange).toHaveBeenCalledTimes(1);
});

it("exposes standard history shortcuts on the toolbar controls", () => {
 const onUndo = vi.fn(), onRedo = vi.fn();
 render(<CanvasControls canFit canCenter canUndo canRedo onUndo={onUndo} onRedo={onRedo} {...handlers()} />);
 expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute("aria-keyshortcuts", "Control+Z Meta+Z");
 expect(screen.getByRole("button", { name: "Redo" })).toHaveAttribute("aria-keyshortcuts", "Control+Y Control+Shift+Z Meta+Shift+Z");
});
