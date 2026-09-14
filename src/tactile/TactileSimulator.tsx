"use client";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FlowGraph } from "../graph/types";
import { layoutGraph } from "../visual/layout";
import { makeTactileFrame } from "./rasterize";
import { needsFocus } from "./viewport";
import { createSimulatorAdapter } from "./adapter";
import type { PlaybackTactileContext, TactileFrame, TactileMode } from "./types";
class TactileBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed ? <section className="display tactile-display" aria-label="Tactile display simulator"><p role="alert">Tactile display unavailable. Your chart and editing history are preserved.</p><button onClick={()=>this.setState({failed:false})}>Retry tactile display</button></section> : this.props.children;}
}
type Props = {
  graph: FlowGraph;
  focus: string | null;
  version: number;
  displayIds: Record<string, string>;
  chartOutline?: ReactNode;
  playbackContext?: PlaybackTactileContext;
};
function Simulator({ graph, focus, version, displayIds, chartOutline, playbackContext }: Props) {
  const [requested, setRequested] = useState<TactileMode | "auto">("auto");
  // Tactile legibility follows graph structure, not arbitrary visual drag coordinates.
  const layout = useMemo(() => layoutGraph(graph, "standard", "topology"), [graph]);
  const autoFocus = useMemo(() => needsFocus(graph, layout), [graph, layout]);
  const mode = requested === "auto" ? (autoFocus ? "focus" : "overview") : requested;
  const frame = useMemo(() => makeTactileFrame(graph, layout, focus, mode, version, playbackContext), [graph, layout, focus, mode, version, playbackContext]);
  return <section className="display tactile-display" aria-labelledby="tactile-title" data-graph-version={frame.version}>
    <div className="display-heading"><h3 id="tactile-title">Tactile display simulator</h3><span className="simulator-tag">120 × 80 pins</span></div>
    <div className="tactile-controls" role="group" aria-label="Tactile viewport">
      <div className="tactile-modes">
        {(["auto", "overview", "focus"] as const).map(choice => (
          <button key={choice} aria-pressed={requested === choice} onClick={() => setRequested(choice)}>
            {choice === "auto" ? "Auto" : choice === "overview" ? "Overview" : "Focused view"}
          </button>
        ))}
        <p className="tactile-mode-desc">
          {mode === "focus" ? "Focused node and immediate neighbors" : "Whole chart"}
          {requested === "auto" && autoFocus ? " — enlarged automatically" : ""}
        </p>
      </div>
      <div className="tactile-stats">
        <span className="tactile-pins-stat">{frame.raisedPins.length ? `${frame.raisedPins.length} pins raised` : "No pins raised"}</span>
        <span className="tactile-info-hint">Raised cross marks focus · Arrows show direction</span>
      </div>
    </div>
    <div className="tactile-surface">
      <PinSurface frame={frame} />
      {chartOutline ? chartOutline : (
        <div className={`tactile-empty${frame.raisedPins.length ? "" : " is-empty"}`}>
          <h4>{frame.raisedPins.length ? `${frame.raisedPins.length} pins raised` : "No pins raised"}</h4>
          {!frame.raisedPins.length && <p className="tactile-hint">Add shapes to see them as raised pins.</p>}
          <p>A raised cross marks the focused shape. Arrowheads show connection direction.</p>
          <ul className="tactile-key">
            {frame.nodeIds.map(id => (
              <li key={id}>
                {displayIds[id]}: {graph.nodes.find(n => n.id === id)?.label}
                {id === frame.focusedNodeId ? " — focused" : ""}
              </li>
            ))}
          </ul>
          {mode === "overview" && autoFocus && <p>Shapes are small at this scale. Choose Focused view for more detail.</p>}
        </div>
      )}
    </div>
    <section className="information-strip" aria-label="Focused node">
      <h4>Braille information strip</h4>
      <p>{frame.focusedNodeId ? `${displayIds[frame.focusedNodeId]}: ` : ""}{frame.text}</p>
      <p className="braille-cells" aria-hidden="true">{frame.brailleCells}</p>
      {frame.unsupported.length > 0 && <p>Unsupported characters: {frame.unsupported.map(c => JSON.stringify(c)).join(", ")}. Each is shown as ⠿.</p>}
    </section>
    <p className="simulation-note">Digital demonstration only; not a physical tactile display or validated Braille output. The Braille preview supports English letters, digits and spaces with capitalization and number markers. Full original text is shown above.</p>
  </section>;
}
export default function TactileSimulator(props:Props){return <TactileBoundary><Simulator {...props}/></TactileBoundary>;}

function PinSurface({frame:incoming}:{frame:TactileFrame}) {
  const [frame,setFrame]=useState(incoming);
  const [error,setError]=useState<Error|null>(null);
  const adapter=useMemo(()=>createSimulatorAdapter(setFrame),[]);
  useEffect(()=>{let active=true; void adapter.render(incoming).catch(error=>{if(active)setError(error instanceof Error?error:new Error("Tactile rendering failed"));});return()=>{active=false;};},[adapter,incoming]);
  if(error) throw error;
  return <svg className={`tactile-pins${frame.raisedPins.length ? "" : " is-empty"}`} viewBox="0 0 120 80" role="img" aria-label={`${frame.mode} tactile view: ${frame.nodeIds.length} nodes, ${frame.edgeIds.length} connections. Raised cross marks focus.`}><defs><pattern id="tactile-pin-grid" width="1" height="1" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.13" fill="#c4d0e2" opacity="0.6"/></pattern></defs><rect width="120" height="80" fill="#edf1f8"/><rect width="120" height="80" fill="url(#tactile-pin-grid)"/>{frame.raisedPins.map(pin=><circle key={pin.y*120+pin.x} cx={pin.x+.5} cy={pin.y+.5} r="0.42" fill="#17243a"/>)}</svg>;
}
