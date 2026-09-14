import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ShapePalette } from "./ShapePalette";

it("places a clicked shape below the last inserted shape", () => {
  const onCommand = vi.fn();
  render(<ShapePalette lastNodeId="previous" onCommand={onCommand} />);
  fireEvent.click(screen.getByRole("button", { name: "Insert process" }));
  expect(onCommand).toHaveBeenCalledWith({
    kind: "add_node",
    type: "process",
    label: "Process",
    placement: { relation: "below", reference: { kind: "id", value: "previous" } },
  });
});
