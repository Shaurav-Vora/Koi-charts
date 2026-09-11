"use client";
import TactileSimulator from "../tactile/TactileSimulator";
import { Component, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createSpeaker, speechPreference } from "./speech";
import { localCommandPreference } from "./preference";
import type { GraphCommand } from "../commands/schema";
import { layoutGraph } from "../visual/layout";
import VisualCanvas from "../visual/VisualCanvas";
import ExportMenu from "../visual/ExportMenu";
import { ShapePalette, NodeInspector } from "./ShapePalette";
import CommandForm from "./CommandForm";
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
  // Laid out once, here, because the canvas and the picture that gets exported have to be the
  // same chart: two independent layouts would drift the moment either one changed.
  const layout = useMemo(() => layoutGraph(graph), [graph]);
  const hasError = presentation ? presentation.status === "error" : state.outcome === "error";
  const focused = graph.nodes.find(node => node.id === focusedNodeId);
  useEffect(() => {
    const removeSelected = (event: KeyboardEvent) => {
      if (event.key !== "Delete" || event.repeat || event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !focusedNodeId || pending) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
      event.preventDefault();
      onCommand({kind:"delete",target:{kind:"node",node:{kind:"id",value:focusedNodeId}}});
    };
    document.addEventListener("keydown", removeSelected);
    return () => document.removeEventListener("keydown", removeSelected);
  }, [focusedNodeId, pending, onCommand]);
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
  const outcomeTone = hasError ? "error" : state.outcome === "committed" ? "success" : state.outcome === "confirmation" || state.outcome === "clarification" ? "warning" : state.outcome === "focused" || state.outcome === "explored" ? "info" : "idle";
  const isIdle = state.outcome === "idle" && !presentation;
  return <>
    <div className="workspace-heading"><h2>Your workspace</h2><span className="workspace-tagline">Build a flowchart, one clear step at a time.</span></div>
    <div className="workspace-deck">
      <div className="voice-controls" data-tone={indicator.tone} role="group" aria-label="Voice workspace">
        <div className="voice-readout">
          <div className="status" role="status" aria-live="polite"><span className="status-dot" aria-hidden="true" />{indicator.label}</div>
          <p className="voice-hint">{indicator.hint}</p>
        </div>
        {voice.active && <span className="mic-level" aria-hidden="true"><span className="mic-level-fill" style={{ width: `${Math.round(Math.min(1, voice.level * 4) * 100)}%` }} /></span>}
        <div className="voice-actions">
          <button className={`voice-button${voice.active ? " is-active" : ""}`} aria-pressed={voice.active} onClick={() => { if (voice.active) { speaker.cancel(); voice.stop(); } else voice.start(); }}>{voice.active ? "Stop voice" : "Start voice"}</button>
          <button className="stop-speech-button" disabled={!inputPaused} onClick={() => speaker.interrupt()}>Stop speaking</button>
          <ToggleSwitch className="local-switch" label="Fast local commands" checked={fastLocal} title="Recognise common phrases on this device instead of sending them to be interpreted." onChange={next => localCommandPreference.write(next)} />
          <ToggleSwitch className="speech-switch" label="Speak replies" checked={speaks} disabled={!supported} title={supported ? undefined : "This browser has no speech engine."} onChange={toggleSpeech} />
        </div>
      </div>
      <section className={`command-feedback ${hasError ? "has-error" : ""}`} data-tone={outcomeTone} aria-label="Command feedback">
        <div key={`${status}-${message}`} className="feedback-body">
          <div className="feedback-meta">
            {isIdle ? (
              <span className="feedback-label">Activity</span>
            ) : (
              <span className="feedback-badge" data-tone={outcomeTone}>{status}</span>
            )}
            {presentation?.source && <span className="feedback-source" data-source={presentation.source}>{presentation.source === "local" ? "Local command" : "Gemini"}</span>}
          </div>
          <p role={!speaks && hasError ? "alert" : undefined} aria-live={speaks || hasError ? undefined : "polite"}>
            {message || (isIdle ? "Ready · Say a voice command or click a shape to begin." : "")}
          </p>
        </div>
        {pending && <div className="pending-actions">
          {pending.kind === "deletion" ? <button className="danger-button" onClick={() => onCommand({ kind: "confirm" })}>Confirm deletion</button> : choiceLabels(graph, pending.candidates, pending.elementKind).map((label, index) => <button key={pending.candidates[index]} onClick={() => dispatch({ type: "choose", candidateId: pending.candidates[index], idSeed: crypto.randomUUID() })}>{`${index + 1}. ${label}`}</button>)}
          <button onClick={() => onCommand({ kind: "cancel" })}>Cancel</button>
        </div>}
      </section>
    </div>
    <div className="diagram-workbench"><div className="palette-column"><ShapePalette lastNodeId={graph.nodes.at(-1)?.id} onCommand={onCommand} />{focused && <NodeInspector key={`${focused.id}-${focused.label}`} node={focused} onCommand={onCommand} />}</div>
      <section className="display visual-display" aria-labelledby="visual-title" data-graph-version={version}>
        <div className="display-heading"><h3 id="visual-title">Visual flowchart</h3><span className="count">{graph.nodes.length} nodes · {graph.edges.length} connections</span><ExportMenu graph={graph} layout={layout} /></div>
        <div className="canvas-wrap"><CanvasBoundary><VisualCanvas
          graph={graph}
          focusedNodeId={focusedNodeId}
          onCommand={onCommand}
          layout={layout}
          canUndo={!!history.past.length}
          canRedo={!!history.future.length}
          onUndo={() => onCommand({ kind: "undo" })}
          onRedo={() => onCommand({ kind: "redo" })}
          canWalk={graph.nodes.length > 0}
          canStep={!!focused}
          onWalk={direction => onCommand({ kind: "walk", direction, branch: null })}
          canExample={graph.nodes.length === 0 && !pending}
          onExample={() => dispatch({ type: "example" })}
          onDescribe={() => onCommand({ kind: "describe", scope: "chart" })}
          onInspect={() => onCommand({ kind: "inspect", node: null })}
          onValidate={() => onCommand({ kind: "validate" })}
        /></CanvasBoundary><PreviewOverlay command={presentation?.preview ?? null} />{!presentation?.preview && !graph.nodes.length && <div className="canvas-welcome"><svg className="welcome-koi" viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="#315ac8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 40C10 41 7 48 6 57c8-1 13-6 16-10 0 6 4 10 10 12 2-8-1-14-6-18" fill="#f4f7ff"/><path d="M26 25c-9-2-13 1-16 6l11 5M38 34c7 2 8 7 7 12l-12-6" fill="#e4edff"/><path d="M45 13C32 11 18 25 19 38c0 8 6 12 12 8 12-8 19-24 14-33Z" fill="#fffaf3"/><path d="M42 14c-5 0-10 3-13 7 3 4 7 5 12 3 2-4 3-7 1-10ZM22 29c-3 5-3 10-1 14 5-1 9-4 9-8-3-1-5-3-8-6Z" fill="#ed704b" stroke="none"/><path d="M35 31c-1 5-5 10-9 13M18 46l-7 7M24 48l4 7"/><circle cx="41" cy="18" r="1.5" fill="#244c9d" stroke="none"/><path d="M45 13l3-2M43 13l-1-3"/><circle cx="51" cy="8" r="2.2" fill="#e7f3ff"/><circle cx="58" cy="4" r="1.3" fill="#e7f3ff" strokeWidth="1.2"/></g></svg><h4>Your chart starts here</h4><p className="welcome-subtext">Say <strong>&ldquo;add a start&rdquo;</strong> to begin with voice, or drag a shape from the left.</p><div className="welcome-prompts" aria-hidden="true"><span>Try saying:</span><code>&ldquo;add a start&rdquo;</code><code>&ldquo;add step Login&rdquo;</code><code>&ldquo;add decision Approved&rdquo;</code></div></div>}</div>
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
