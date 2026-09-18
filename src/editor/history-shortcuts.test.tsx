import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";

vi.mock("../visual/VisualCanvas", () => ({
  default: ({ canUndo, canRedo }: { canUndo?: boolean; canRedo?: boolean }) => (
    <>
      <button type="button" aria-keyshortcuts="Control+Z" disabled={!canUndo}>Undo</button>
      <button type="button" aria-keyshortcuts="Control+Y Control+Shift+Z" disabled={!canRedo}>Redo</button>
    </>
  ),
}));

it("undoes and redoes chart edits with standard keyboard shortcuts", () => {
  const coordinator = createEditorCoordinator();
  render(<Editor coordinator={coordinator} />);

  fireEvent.click(screen.getByRole("button", { name: "Insert process" }));
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);

  fireEvent.keyDown(document, { key: "z", ctrlKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(0);

  fireEvent.keyDown(document, { key: "y", ctrlKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);

  fireEvent.keyDown(document, { key: "z", ctrlKey: true });
  fireEvent.keyDown(document, { key: "Z", ctrlKey: true, shiftKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);
});

it("leaves history shortcuts available to text fields and ignores unavailable actions", () => {
  const coordinator = createEditorCoordinator();
  render(<Editor coordinator={coordinator} />);

  const label = screen.getByLabelText("Node label");
  fireEvent.keyDown(label, { key: "z", ctrlKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(0);

  fireEvent.click(screen.getByRole("button", { name: "Insert process" }));
  const shapeLabel = screen.getByLabelText("Shape label");
  fireEvent.keyDown(shapeLabel, { key: "z", ctrlKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);

  fireEvent.keyDown(document, { key: "y", ctrlKey: true });
  expect(coordinator.getSnapshot().editor.engine.graph.nodes).toHaveLength(1);
});
