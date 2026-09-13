import type { FlowGraph } from "../graph/types";
import { auditGraph } from "./engine";
import type { AuditAction, AuditIssue, AuditState } from "./types";

export function createAuditState(): AuditState {
  return {
    status: "closed",
    issues: [],
    currentIssueId: null,
    graphVersion: null,
    message: "No chart check is open.",
  };
}

export function currentAuditIssue(state: AuditState): AuditIssue | null {
  return state.issues.find(issue => issue.id === state.currentIssueId) ?? null;
}

const issueCount = (count: number) => `${count} ${count === 1 ? "issue" : "issues"}`;

function opened(graph: FlowGraph, graphVersion: number): AuditState {
  const issues = auditGraph(graph);
  const first = issues[0] ?? null;
  return {
    status: "open",
    issues,
    currentIssueId: first?.id ?? null,
    graphVersion,
    message: first
      ? `${issueCount(issues.length)} found. First: ${first.title}.`
      : "Check complete. No issues found.",
  };
}

function recalculate(graph: FlowGraph, state: AuditState, graphVersion: number): AuditState {
  if (state.status === "closed") return state;
  const issues = auditGraph(graph);
  if (!issues.length) {
    return { ...state, issues, currentIssueId: null, graphVersion, message: "Check complete. No issues found." };
  }
  const oldIndex = Math.max(0, state.issues.findIndex(issue => issue.id === state.currentIssueId));
  const retained = issues.find(issue => issue.id === state.currentIssueId);
  const current = retained ?? issues[Math.min(oldIndex, issues.length - 1)];
  return {
    ...state,
    issues,
    currentIssueId: current.id,
    graphVersion,
    message: retained
      ? `${issueCount(issues.length)} remain. ${current.title}.`
      : `Issue resolved. Next: ${current.title}.`,
  };
}

export function auditTransition(graph: FlowGraph, state: AuditState, action: AuditAction): AuditState {
  if (action.type === "close") return createAuditState();
  if (action.type === "open") return opened(graph, action.graphVersion);
  if (action.type === "graph_changed") return recalculate(graph, state, action.graphVersion);
  if (state.status === "closed") return { ...state, message: "Check the chart first." };
  const current = currentAuditIssue(state);
  if (!current) return { ...state, message: "Check complete. No issues found." };
  if (action.type === "repeat") return { ...state, message: `Current issue: ${current.title}.` };
  const index = state.issues.findIndex(issue => issue.id === current.id);
  const nextIndex = action.type === "next"
    ? Math.min(index + 1, state.issues.length - 1)
    : Math.max(index - 1, 0);
  const next = state.issues[nextIndex];
  const boundary = nextIndex === index
    ? action.type === "next" ? "Last issue" : "First issue"
    : action.type === "next" ? "Next" : "Previous";
  return { ...state, currentIssueId: next.id, message: `${boundary}: ${next.title}.` };
}

export type { AuditAction, AuditState } from "./types";
