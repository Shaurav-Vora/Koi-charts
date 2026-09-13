import { currentAuditIssue } from "./state";
import type { AuditAction, AuditState } from "./types";

type AuditPanelProps = {
  graphVersion: number;
  state: AuditState;
  onAction: (action: AuditAction) => void;
  announce?: boolean;
};

export default function AuditPanel({ graphVersion, state, onAction, announce = true }: AuditPanelProps) {
  const active = state.status === "open";
  const current = currentAuditIssue(state);
  const index = current ? state.issues.findIndex(issue => issue.id === current.id) : -1;
  const dispatch = (type: AuditAction["type"]) => onAction({ type, graphVersion } as AuditAction);

  return <section className="audit-panel is-compact" data-result={current?.severity ?? (active ? "clear" : "closed")} role="region" aria-label="Check chart">
    <button className={`audit-launch${active ? " is-active" : ""}`} type="button" aria-expanded={active} onClick={() => dispatch(active ? "close" : "open")}>Check chart</button>
    {active && <div className="audit-popover">
      <div className="audit-heading">
        <div>
          <span className="audit-eyebrow">Chart review</span>
          <h3>Check chart</h3>
        </div>
        <button className="audit-close" type="button" aria-label="Close chart check" onClick={() => dispatch("close")}>×</button>
      </div>

      {current ? <>
        <div className="audit-summary">
          <strong>{state.issues.length} {state.issues.length === 1 ? "issue" : "issues"}</strong>
          <span>Issue {index + 1} of {state.issues.length}</span>
        </div>
        <progress className="audit-progress" aria-label="Audit progress" max={state.issues.length} value={index + 1} />
        <div className="audit-current" role="status" aria-live={announce ? "polite" : "off"}>
          <span className="audit-severity" data-severity={current.severity}>{current.severity === "required" ? "Required" : "Review"}</span>
          <h4>{current.title}</h4>
          <p>{current.message}</p>
          <div className="audit-suggestion">
            <span>Suggested correction</span>
            <p>{current.suggestion}</p>
          </div>
        </div>
        <div className="audit-actions">
          <button type="button" aria-label="Previous issue" disabled={index <= 0} onClick={() => dispatch("previous")}>Previous</button>
          <button type="button" aria-label="Repeat issue" onClick={() => dispatch("repeat")}>Repeat</button>
          <button className="audit-primary" type="button" aria-label="Next issue" disabled={index >= state.issues.length - 1} onClick={() => dispatch("next")}>Next</button>
        </div>
      </> : <div className="audit-clear" role="status" aria-live={announce ? "polite" : "off"}>
        <span aria-hidden="true">✓</span>
        <div><h4>No issues found</h4><p>The chart has a clear structure from Start to End.</p></div>
      </div>}
    </div>}
  </section>;
}
