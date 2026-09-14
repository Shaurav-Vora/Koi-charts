import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FlowGraph } from "../graph/types";
import { auditTransition, createAuditState } from "./state";
import AuditPanel from "./AuditPanel";

const empty: FlowGraph = { schemaVersion: 1, nodes: [], edges: [] };

describe("AuditPanel", () => {
  it("opens chart review from a compact named region", () => {
    const onAction = vi.fn();
    render(<AuditPanel graphVersion={2} state={createAuditState()} onAction={onAction} />);

    const panel = screen.getByRole("region", { name: "Check chart" });
    expect(panel).toHaveClass("is-compact");
    fireEvent.click(screen.getByRole("button", { name: "Check chart" }));

    expect(onAction).toHaveBeenCalledWith({ type: "open", graphVersion: 2 });
  });

  it("shows one concise issue with severity, progress, and correction", () => {
    const state = auditTransition(empty, createAuditState(), { type: "open", graphVersion: 2 });
    const onFix = vi.fn();
    render(<AuditPanel graphVersion={2} state={state} onAction={vi.fn()} onFix={onFix} />);

    expect(screen.getByRole("button", { name: "Check chart" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Check chart" })).toHaveClass("is-compact");
    expect(screen.getByRole("heading", { name: "Check chart" })).toBeVisible();
    expect(screen.getByText("2 issues")).toBeVisible();
    expect(screen.getByText("Issue 1 of 2")).toBeVisible();
    expect(screen.getByText("Required")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Add a Start node" })).toBeVisible();
    expect(screen.getByText("No start node.")).toBeVisible();
    expect(screen.getByText("Add one Start node to show where the flow begins.")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "Audit progress" })).toHaveAttribute("value", "1");
    fireEvent.click(screen.getByRole("button", { name: "Add Start" }));
    expect(onFix).toHaveBeenCalledWith({ kind: "add_node", type: "start", label: "Start", placement: null });
  });

  it("dispatches issue navigation and closing with the current graph version", () => {
    const onAction = vi.fn();
    const state = auditTransition(empty, createAuditState(), { type: "open", graphVersion: 2 });
    render(<AuditPanel graphVersion={2} state={state} onAction={onAction} />);

    expect(screen.getByRole("button", { name: "Previous issue" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Repeat issue" }));
    fireEvent.click(screen.getByRole("button", { name: "Next issue" }));
    fireEvent.click(screen.getByRole("button", { name: "Close chart check" }));

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      { type: "repeat", graphVersion: 2 },
      { type: "next", graphVersion: 2 },
      { type: "close", graphVersion: 2 },
    ]);
  });

  it("shows a clear result without issue navigation", () => {
    const complete: FlowGraph = {
      schemaVersion: 1,
      nodes: [
        { id: "start", type: "start", label: "Begin" },
        { id: "end", type: "end", label: "Finish" },
      ],
      edges: [{ id: "finish", source: "start", target: "end" }],
    };
    const state = auditTransition(complete, createAuditState(), { type: "open", graphVersion: 4 });
    render(<AuditPanel graphVersion={4} state={state} onAction={vi.fn()} />);

    expect(screen.getByText("No issues found")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Next issue" })).not.toBeInTheDocument();
  });
});
