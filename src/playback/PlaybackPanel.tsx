import type { FlowGraph } from "../graph/types";
import type { PlaybackAction, PlaybackState } from "./types";

type PlaybackPanelProps = {
  graph: FlowGraph;
  graphVersion: number;
  state: PlaybackState;
  onAction: (action: PlaybackAction) => void;
  announce?: boolean;
};

const statusLabels: Record<PlaybackState["status"], string> = {
  idle: "Ready",
  choosing_start: "Choose a start",
  paused: "Paused",
  choosing_branch: "Choose a branch",
  complete: "Complete",
  blocked: "Needs attention",
};

export default function PlaybackPanel({ graph, graphVersion, state, onAction, announce = true }: PlaybackPanelProps) {
  const active = state.status !== "idle";
  const current = graph.nodes.find(node => node.id === state.currentNodeId);
  const routeLabels = state.route.map(step => graph.nodes.find(node => node.id === step.nodeId)?.label ?? "Changed node");
  const currentGraph = state.graphVersion === graphVersion;
  const canBack = currentGraph && state.route.length > 1;
  const dispatch = (action: PlaybackAction) => onAction(action);

  return <section className="playback-panel is-compact" data-status={state.status} role="region" aria-label="Test chart">
    <button className={`playback-launch${active ? " is-active" : ""}`} type="button" aria-expanded={active} onClick={() => dispatch({ type: active ? "stop" : "start", graphVersion })}>Test chart</button>
    {active && <div className="playback-popover">
      <div className="playback-heading">
        <h3>Test chart</h3>
        <span className="playback-status"><span aria-hidden="true" />{statusLabels[state.status]}</span>
      </div>
      <p className="playback-message" role="status" aria-live={announce ? "polite" : "off"}>{state.message}</p>
      {current && <p className="playback-progress"><strong>Step {state.route.length} · {current.label}</strong><span>{current.type}</span></p>}
      {routeLabels.length > 1 && <p className="playback-route"><span>Route</span>{routeLabels.join(" → ")}</p>}

      {!!state.warnings.length && <div className="playback-warnings">
        <strong>Chart notes</strong>
        <ul>{state.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
      </div>}

      {state.status === "choosing_start" && <div className="playback-choices" aria-label="Start choices">
        {state.choices.map(choice => <button type="button" key={choice.id} onClick={() => dispatch({ type: "choose_start", nodeId: choice.id, graphVersion })}>Start at {choice.label}</button>)}
      </div>}
      {state.status === "choosing_branch" && <div className="playback-choices" aria-label="Branch choices">
        {state.choices.map(choice => <button type="button" key={choice.id} onClick={() => dispatch({ type: "choose_branch", edgeId: choice.id, graphVersion })}>Take {choice.label}</button>)}
      </div>}

      <div className="playback-actions">
        {state.status === "paused" && <button className="playback-primary" type="button" onClick={() => dispatch({ type: "next", graphVersion })}>Next step</button>}
        <button type="button" disabled={!canBack} onClick={() => dispatch({ type: "back", graphVersion })}>Back one step</button>
        {current && currentGraph && <button type="button" onClick={() => dispatch({ type: "repeat", graphVersion })}>Repeat step</button>}
        {(state.status === "complete" || state.status === "blocked") && <button type="button" onClick={() => dispatch({ type: "restart", graphVersion })}>Restart test</button>}
        <button type="button" onClick={() => dispatch({ type: "stop", graphVersion })}>Stop test</button>
      </div>
    </div>}
  </section>;
}
