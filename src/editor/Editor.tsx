"use client";
import TactileSimulator from "../tactile/TactileSimulator";
import { Component, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createSpeaker, speechPreference } from "./speech";
import { localCommandPreference } from "./preference";
import type { GraphCommand } from "../commands/schema";
import type { FlowGraph } from "../graph/types";
import { layoutGraph } from "../visual/layout";
import VisualCanvas from "../visual/VisualCanvas";
import { ShapePalette, NodeInspector } from "./ShapePalette";
import CommandForm from "./CommandForm";
import CommandGuide from "./CommandGuide";
import ToggleSwitch from "./ToggleSwitch";
import { createEditorCoordinator } from "./coordinator";
import { useVoice } from "./useVoice";
import { statusLabels } from "./status";
import { voiceIndicator } from "./voice-status";
import { briefReply } from "./brief-reply";
import { choiceLabels } from "../feedback/choices";
import PreviewOverlay from "../visual/PreviewOverlay";

class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="canvas-error" role="alert"><p>Visual canvas unavailable. Your chart is preserved in the outline below.</p><button onClick={() => this.setState({ failed: false })}>Retry canvas</button></div> : this.props.children; }
}
function LaidOutCanvas(props: { graph: FlowGraph; focusedNodeId: string | null; onCommand: (command: GraphCommand) => void }) {
  const layout = useMemo(() => layoutGraph(props.graph), [props.graph]);
  return <VisualCanvas {...props} layout={layout} />;
}
export default function Editor({ coordinator: supplied }: { coordinator?: ReturnType<typeof createEditorCoordinator> } = {}) {
  const [local] = useState(() => createEditorCoordinator());
  const coordinator = supplied ?? local;
  const { editor: state, presentation } = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getSnapshot);
  const dispatch = coordinator.dispatch;
  const speaker = useMemo(() => createSpeaker(), []);
  // Talking over a reply stops it: the microphone is muted while one plays, so without this
  // the author's next command is discarded and they are left repeating themselves.
  const voice = useVoice(coordinator, speaker.getSnapshot, speaker.interrupt);
  const onCommand = useCallback((command: GraphCommand) => dispatch({ type: "command", command, idSeed: crypto.randomUUID() }), [dispatch]);
  const { graph, focusedNodeId, pending, history, version } = state.engine;
  const hasError = presentation ? presentation.status === "error" : state.outcome === "error";
  const focused = graph.nodes.find(node => node.id === focusedNodeId);
  const message = presentation?.error ?? presentation?.text ?? state.message;
  const spokenMessage = briefReply(state, message);
  const supported = useSyncExternalStore(speaker.subscribe, () => speaker.supported, () => false);
  const inputPaused = useSyncExternalStore(speaker.subscribe, speaker.getSnapshot, () => false);
  // On by default: an author who cannot see the chart has no other way to receive a reply.
  const wanted = useSyncExternalStore(speechPreference.subscribe, speechPreference.read, speechPreference.readOnServer);
  const fastLocal = useSyncExternalStore(localCommandPreference.subscribe, localCommandPreference.read, localCommandPreference.readOnServer);
  // A browser with no speech engine must keep its live region, or replies reach nobody at all.
  const speaks = wanted && supported;
  useEffect(() => () => speaker.dispose(), [speaker]);
  useEffect(() => {
    if (!speaks) return speaker.cancel();
    // These states contain the author's transcript, not a reply from the chart.
    if (presentation?.status === "speech_detected" || presentation?.status === "previewing" || presentation?.status === "interpreting") return speaker.cancel();
    speaker.speak(spokenMessage);
    // Depending on the store objects rather than the text repeats an identical reply, which is
    // how pressing Back twice at a dead end confirms twice that there is still nothing behind.
  }, [state, presentation, speaks, speaker, spokenMessage]);
  const toggleSpeech = (next: boolean) => { speechPreference.write(next); if (!next) speaker.cancel(); };
  const indicator = voiceIndicator(voice.connectionStatus, inputPaused, presentation?.status);
  const status = presentation ? statusLabels[presentation.status] : state.outcome === "idle" ? "Idle" : state.outcome === "error" ? "Command not applied" : state.outcome === "confirmation" ? "Confirmation needed" : state.outcome === "clarification" ? "Clarification needed" : state.outcome === "committed" ? "Change applied" : state.outcome === "focused" ? "Focus updated" : state.outcome === "cancelled" ? "Cancelled" : "Chart explored";
  return <>
    <div className="workspace-heading"><div><h2>Your workspace</h2><p>Build a flowchart, one clear step at a time.</p></div></div>
    <div className="editor-toolbar"><div className="voice-controls" data-tone={indicator.tone} role="group" aria-label="Voice workspace">
      <div className="voice-readout">
        <div className="status" role="status" aria-live="polite"><span className="status-dot" aria-hidden="true" />{indicator.label}</div>
        <p className="voice-hint">{indicator.hint}</p>
      </div>
      {voice.active && <span className="mic-level" aria-hidden="true"><span className="mic-level-fill" style={{ width: `${Math.round(Math.min(1, voice.level * 4) * 100)}%` }} /></span>}
      <button className={`voice-button${voice.active ? " is-active" : ""}`} aria-pressed={voice.active} onClick={() => { if (voice.active) { speaker.cancel(); voice.stop(); } else voice.start(); }}>{voice.active ? "Stop voice" : "Start voice"}</button>
      {/* Interrupting matters more than it sounds: a long reply blocks the microphone until it
          finishes, so without this the author must wait out a description they no longer want. */}
      <button className="stop-speech-button" disabled={!inputPaused} onClick={() => speaker.interrupt()}>Stop speaking</button>
      {/* An escape hatch, not a feature switch: if a template ever reads a phrase wrongly, the
          author hands everything back to the model without losing voice editing entirely. */}
      <ToggleSwitch className="local-switch" label="Fast local commands" checked={fastLocal} title="Recognise common phrases on this device instead of sending them to be interpreted." onChange={next => localCommandPreference.write(next)} />
      {/* Speaking and the live region below say the same words, so exactly one of them is ever
          active: a screen reader user would otherwise hear every reply twice. */}
      <ToggleSwitch className="speech-switch" label="Speak replies" checked={speaks} disabled={!supported} title={supported ? undefined : "This browser has no speech engine."} onChange={toggleSpeech} />
    </div><div className="history-controls"><button disabled={!history.past.length} onClick={() => onCommand({ kind: "undo" })}>Undo</button><button disabled={!history.future.length} onClick={() => onCommand({ kind: "redo" })}>Redo</button></div><div className="walk-controls" role="group" aria-label="Walk the chart">
      {/* The same cursor the voice commands move, reachable without speaking. Each step
          announces where it landed and every way out, through the feedback live region. */}
      <button disabled={!graph.nodes.length} onClick={() => onCommand({ kind: "walk", direction: "first", branch: null })}>Go to start</button>
      <button disabled={!focused} onClick={() => onCommand({ kind: "walk", direction: "back", branch: null })}>Back</button>
      <button disabled={!focused} onClick={() => onCommand({ kind: "walk", direction: "next", branch: null })}>Next</button>
      <button disabled={!focused} onClick={() => onCommand({ kind: "walk", direction: "stay", branch: null })}>Where am I</button>
    </div><div className="query-controls"><button disabled={graph.nodes.length > 0 || !!pending} onClick={() => dispatch({type:"example"})}>Load large example</button><button onClick={() => onCommand({ kind: "describe", scope: "chart" })}>Describe chart</button><button disabled={!focused} onClick={() => onCommand({ kind: "inspect", node: null })}>Inspect focus</button><button onClick={() => onCommand({ kind: "validate" })}>Validate chart</button></div></div>
    {/* Beside the voice button, not buried at the bottom: the phrases are only useful to someone
        deciding what to say next, and reaching them must not cost a trip through the whole page. */}
    <CommandGuide />
    <section className={`command-feedback ${hasError ? "has-error" : ""}`} aria-label="Command feedback">
      <span className="feedback-label">{status}</span>
      {presentation?.source && <span className="feedback-source" data-source={presentation.source}>{presentation.source === "local" ? "Local command" : "Gemini"}</span>}
      <p role={!speaks && hasError ? "alert" : undefined} aria-live={speaks || hasError ? undefined : "polite"}>{message}</p>
      {pending && <div className="pending-actions">
        {pending.kind === "deletion" ? <button className="danger-button" onClick={() => onCommand({ kind: "confirm" })}>Confirm deletion</button> : choiceLabels(graph, pending.candidates, pending.elementKind).map((label, index) => <button key={pending.candidates[index]} onClick={() => dispatch({ type: "choose", candidateId: pending.candidates[index], idSeed: crypto.randomUUID() })}>{`${index + 1}. ${label}`}</button>)}
        <button onClick={() => onCommand({ kind: "cancel" })}>Cancel</button>
      </div>}
    </section>
    <div className="diagram-workbench"><div className="palette-column"><ShapePalette lastNodeId={graph.nodes.at(-1)?.id} onCommand={onCommand} />{focused && <NodeInspector key={`${focused.id}-${focused.label}`} node={focused} onCommand={onCommand} />}</div>
      <section className="display visual-display" aria-labelledby="visual-title" data-graph-version={version}>
        <div className="display-heading"><h3 id="visual-title">Visual flowchart</h3><span className="count">{graph.nodes.length} nodes · {graph.edges.length} connections</span></div>
        <div className="canvas-wrap"><CanvasBoundary><LaidOutCanvas graph={graph} focusedNodeId={focusedNodeId} onCommand={onCommand} /></CanvasBoundary><PreviewOverlay command={presentation?.preview ?? null} />{!presentation?.preview && !graph.nodes.length && <div className="canvas-welcome"><h4>Your chart starts here</h4><p>Drag a shape from the left, or click one to begin.</p></div>}</div>
        <div className="display-footer"><p>Drag shapes to move them. Use the dots to connect. Double-click a shape to rename it, or click an arrow to label it.</p></div>
      </section>
    </div><details className="keyboard-editor"><summary>Keyboard editing &amp; advanced commands</summary><CommandForm graph={graph} focusedNodeId={focusedNodeId} onCommand={onCommand} /></details><div className="secondary-displays">
      <TactileSimulator graph={graph} focus={focusedNodeId} version={version} displayIds={state.displayIds} />
    </div>
    <section className="chart-structure" aria-label="Chart structure"><h3>Chart outline</h3><p className="outline-intro">The same chart, available as text. Node buttons change focus.</p>
      {graph.nodes.length ? <ul className="node-list">{graph.nodes.map(node => <li key={node.id}><button aria-label={`Focus ${node.label}`} aria-pressed={node.id === focusedNodeId} onClick={() => onCommand({ kind: "focus", node: { kind: "id", value: node.id } })}>{node.label}</button><span>{node.type}{node.id === focusedNodeId ? " · Focused" : ""}</span></li>)}</ul> : <p>No nodes yet.</p>}
      <h4>Connections</h4>{graph.edges.length ? <ul className="edge-list">{graph.edges.map(edge => <li key={edge.id}>{graph.nodes.find(node => node.id === edge.source)?.label} → {graph.nodes.find(node => node.id === edge.target)?.label} <span>({edge.label ?? "unlabeled"})</span></li>)}</ul> : <p>No connections yet.</p>}
    </section>
  </>;
}
