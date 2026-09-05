import type { TactileAdapter, TactileFrame } from "./types";
// The output adapter receives an isolated frame, never graph/editor state.
export function createSimulatorAdapter(present: (frame:TactileFrame)=>void):TactileAdapter {
  return { async render(frame) { present(structuredClone(frame)); } };
}
