import { describe, expect, it } from "vitest";
import type { AuditIssue } from "./types";
import { assistedFixFor, guidedEditFor } from "./fixes";

const issue = (code: AuditIssue["code"]): AuditIssue => ({
  id: `chart:${code}`,
  code,
  severity: "required",
  title: "Issue",
  message: "Issue found.",
  suggestion: "Correct it.",
  target: { kind: "chart", focusNodeId: null },
});

describe("audit assisted fixes", () => {
  it("creates safe add-node commands for missing chart boundaries", () => {
    expect(assistedFixFor(issue("missing-start"))).toEqual({
      label: "Add Start",
      command: { kind: "add_node", type: "start", label: "Start", placement: null },
    });
    expect(assistedFixFor(issue("missing-end"))).toEqual({
      label: "Add End",
      command: { kind: "add_node", type: "end", label: "End", placement: null },
    });
  });

  it("does not offer automatic edits for issues that need an author decision", () => {
    expect(assistedFixFor(issue("multiple-starts"))).toBeNull();
  });

  it("routes ambiguous node and edge issues to their existing editors", () => {
    expect(guidedEditFor({
      ...issue("duplicate-label"),
      target: { kind: "node", nodeId: "review", focusNodeId: "review" },
    })).toEqual({ label: "Edit node label", target: { kind: "node", nodeId: "review" } });
    expect(guidedEditFor({
      ...issue("unlabeled-decision-branch"),
      target: { kind: "edge", edgeId: "yes", focusNodeId: "decision" },
    })).toEqual({ label: "Label connection", target: { kind: "edge", edgeId: "yes" } });
  });
});
