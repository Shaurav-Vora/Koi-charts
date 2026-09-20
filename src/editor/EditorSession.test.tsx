import { useState, useSyncExternalStore } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EditorSessionProvider, useEditorSessionCoordinator } from "./EditorSession";

function WorkspaceProbe() {
  const coordinator = useEditorSessionCoordinator();
  const snapshot = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
  return <>
    <output aria-label="Shape count">{snapshot.editor.engine.graph.nodes.length}</output>
    <button type="button" onClick={() => coordinator.dispatch({
      type: "command",
      idSeed: "session-node",
      command: { kind: "add_node", type: "start", label: "Begin", placement: null },
    })}>Add shape</button>
    <button type="button" onClick={() => coordinator.dispatch({
      type: "command",
      idSeed: "undo",
      command: { kind: "undo" },
    })}>Undo</button>
  </>;
}

function RouteHarness() {
  const [page, setPage] = useState<"workspace" | "docs">("workspace");
  return <EditorSessionProvider>
    <button type="button" onClick={() => setPage("workspace")}>Workspace</button>
    <button type="button" onClick={() => setPage("docs")}>Documentation</button>
    {page === "workspace" ? <WorkspaceProbe /> : <p>Documentation page</p>}
  </EditorSessionProvider>;
}

describe("editor route session", () => {
  it("preserves the chart and undo history while the workspace route is unmounted", () => {
    render(<RouteHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Add shape" }));
    expect(screen.getByLabelText("Shape count")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "Documentation" }));
    expect(screen.queryByLabelText("Shape count")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Workspace" }));

    expect(screen.getByLabelText("Shape count")).toHaveTextContent("1");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Shape count")).toHaveTextContent("0");
  });
});
