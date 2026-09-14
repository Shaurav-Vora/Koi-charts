import type { GraphCommand } from "../commands/schema";
import type { AuditIssue } from "./types";

export type AssistedAuditFix = {
  label: string;
  command: GraphCommand;
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
