import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { serializeKoiProject } from "../projects/koi-file";
import type { FlowGraph } from "../graph/types";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:project");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("Editor project controls", () => {
  it("loads a project through the heading control and Undo restores the previous chart", async () => {
    const coordinator = createEditorCoordinator();
    coordinator.dispatch({ type: "command", idSeed: "old", command: { kind: "add_node", type: "start", label: "Old chart", placement: null } });
    const listener = vi.fn();
    coordinator.subscribe(listener);
    const { container } = render(<Editor coordinator={coordinator} />);
    listener.mockClear();
    const imported: FlowGraph = {
      schemaVersion: 1,
      nodes: [{ id: "new-start", type: "start", label: "Imported chart" }],
      edges: [],
    };
    const bytes = new TextEncoder().encode(serializeKoiProject(imported)).buffer;
    const file = { name: "imported.koi", size: bytes.byteLength, arrayBuffer: vi.fn(async () => bytes) } as unknown as File;
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;

    await act(async () => { fireEvent.change(input, { target: { files: [file] } }); });

    await waitFor(() => expect(within(screen.getByRole("region", { name: "Chart structure" })).getByText("Imported chart")).toBeVisible());
    expect(screen.getByRole("region", { name: "Command feedback" })).toHaveTextContent("Loaded 1 shape and 0 connections from imported.koi.");
    expect(listener).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("region", { name: "Chart structure" })).toHaveTextContent("Old chart");
  });
});
