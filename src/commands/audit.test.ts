// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createEditorCoordinator } from "../editor/coordinator";
import { createEngineState, execute } from "./execute";
import { parseLocal } from "./local";
import type { GraphCommand } from "./schema";

describe("local chart audit commands", () => {
  it.each([
    ["Check chart", { kind: "audit", action: "open" }],
    ["Validate the chart.", { kind: "audit", action: "open" }],
    ["Next issue", { kind: "audit", action: "next" }],
    ["Previous issue", { kind: "audit", action: "previous" }],
    ["Repeat issue", { kind: "audit", action: "repeat" }],
    ["Close check", { kind: "audit", action: "close" }],
  ] as const)("parses %s deterministically", (spoken, command) => {
    expect(parseLocal(spoken)).toEqual(command);
  });

  it("keeps audit commands out of the graph executor", () => {
    const state = createEngineState();

    const result = execute(state, { kind: "audit", action: "open" }, () => "unused");

    expect(result).toMatchObject({ outcome: "error", message: "Use Check chart to open the chart review." });
    expect(result.state).toBe(state);
  });

  it("runs the core audit phrases locally without calling Gemini", async () => {
    const interpret = vi.fn(async () => ({ kind: "validate" } as GraphCommand));
    const coordinator = createEditorCoordinator(interpret);
    coordinator.turns.start("voice");

    await coordinator.turns.accept({ sessionId: "voice", turnId: "1", text: "Check chart.", final: true });
    await coordinator.turns.accept({ sessionId: "voice", turnId: "2", text: "Next issue.", final: true });
    await coordinator.turns.accept({ sessionId: "voice", turnId: "3", text: "Previous issue.", final: true });
    await coordinator.turns.accept({ sessionId: "voice", turnId: "4", text: "Repeat issue.", final: true });
    await coordinator.turns.accept({ sessionId: "voice", turnId: "5", text: "Close check.", final: true });

    expect(interpret).not.toHaveBeenCalled();
    expect(coordinator.getSnapshot().presentation?.source).toBe("local");
    expect(coordinator.getSnapshot().audit.status).toBe("closed");
  });
});
