import type { EdgeId, NodeId } from "../graph/types";

export type AuditSeverity = "required" | "review";

export type AuditCode =
  | "missing-start"
  | "multiple-starts"
  | "missing-end"
  | "unreachable-node"
  | "dead-end"
  | "decision-branch-count"
  | "unlabeled-decision-branch"
  | "no-route-to-end"
  | "duplicate-label";

export type AuditTarget =
  | { kind: "chart"; focusNodeId: null }
  | { kind: "node"; nodeId: NodeId; focusNodeId: NodeId }
  | { kind: "edge"; edgeId: EdgeId; focusNodeId: NodeId };

export interface AuditIssue {
  id: string;
  code: AuditCode;
  severity: AuditSeverity;
  title: string;
  message: string;
  suggestion: string;
  target: AuditTarget;
}

export interface AuditState {
  status: "closed" | "open";
  issues: AuditIssue[];
  currentIssueId: string | null;
  graphVersion: number | null;
  message: string;
}

export type AuditAction =
  | { type: "open"; graphVersion: number }
  | { type: "next"; graphVersion: number }
  | { type: "previous"; graphVersion: number }
  | { type: "repeat"; graphVersion: number }
  | { type: "close"; graphVersion: number }
  | { type: "graph_changed"; graphVersion: number };
