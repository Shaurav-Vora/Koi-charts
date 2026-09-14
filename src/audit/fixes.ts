import type { GraphCommand } from "../commands/schema";
import type { AuditIssue } from "./types";

export type AssistedAuditFix = {
  label: string;
  command: GraphCommand;
};

export type GuidedAuditEditTarget =
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; edgeId: string };

export type GuidedAuditEdit = {
  label: string;
  target: GuidedAuditEditTarget;
};

export function assistedFixFor(issue: AuditIssue): AssistedAuditFix | null {
  if (issue.code === "missing-start") {
    return {
      label: "Add Start",
      command: { kind: "add_node", type: "start", label: "Start", placement: null },
    };
  }
  if (issue.code === "missing-end") {
    return {
      label: "Add End",
      command: { kind: "add_node", type: "end", label: "End", placement: null },
    };
  }
  return null;
}

export function guidedEditFor(issue: AuditIssue): GuidedAuditEdit | null {
  if ((issue.code === "duplicate-label" || issue.code === "multiple-starts") && issue.target.kind === "node") {
    return {
      label: issue.code === "multiple-starts" ? "Review Start node" : "Edit node label",
      target: { kind: "node", nodeId: issue.target.nodeId },
    };
  }
  if (issue.code === "unlabeled-decision-branch" && issue.target.kind === "edge") {
    return {
      label: "Label connection",
      target: { kind: "edge", edgeId: issue.target.edgeId },
    };
  }
  return null;
}
