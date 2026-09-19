import { render, screen } from "@testing-library/react";
import type { NodeProps } from "@xyflow/react";
import { describe, expect, it, vi } from "vitest";
import FlowNode, { type CanvasNode } from "./FlowNode";

vi.mock("@xyflow/react", async importOriginal => {
  const actual = await importOriginal<typeof import("@xyflow/react")>();
  return { ...actual, Handle: () => null };
});

function props(displayId: string): NodeProps<CanvasNode> {
  return {
    id: "review",
    type: "flowNode",
    data: { label: "Review application", displayId, nodeType: "process", focused: false, onFocus: vi.fn(), onRename: vi.fn() },
    selected: false,
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    dragging: false,
    draggable: true,
    selectable: true,
    deletable: true,
  };
}

describe("FlowNode short reference", () => {
  it("shows the reference with the node type and includes it in the focus name", () => {
    render(<FlowNode {...props("N2")} />);

    expect(screen.getByText("N2")).toBeVisible();
    expect(screen.getByRole("button", { name: "Focus N2, Review application" })).toBeVisible();
  });
});