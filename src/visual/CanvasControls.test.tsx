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
