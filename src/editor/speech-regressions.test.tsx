import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";
vi.mock("../visual/VisualCanvas",()=>({
 default:({onWalk,onInspect,hideNavigationDock}:{onWalk?:(direction:"stay")=>void;onInspect?:()=>void;hideNavigationDock?:boolean})=><>
  {!hideNavigationDock && <button type="button" onClick={()=>onWalk?.("stay")}>Where am I</button>}
  {!hideNavigationDock && <button type="button" onClick={onInspect}>Inspect focus</button>}
 </>
}));
class Utterance { constructor(public text:string){} }
function browserSpeech(){
 const speak=vi.fn(),cancel=vi.fn();
 vi.stubGlobal("speechSynthesis",{getVoices:()=>[],speak,cancel});
 vi.stubGlobal("SpeechSynthesisUtterance",Utterance);
 return {speak,cancel};
}
afterEach(()=>{cleanup();localStorage.clear();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("hydrates the speech toggle without server/client mismatches",async()=>{
 vi.stubGlobal("speechSynthesis",undefined);vi.stubGlobal("SpeechSynthesisUtterance",undefined);
 const container=document.createElement("div");container.innerHTML=renderToString(<Editor/>);document.body.append(container);
 const before=container.querySelector(".speech-switch");expect(before?.getAttribute("aria-checked")).toBe("false");
 browserSpeech();const recoverable=vi.fn(),errors=vi.spyOn(console,"error").mockImplementation(()=>{});let root:Root;
 try {
  await act(async()=>{root=hydrateRoot(container,<Editor/>,{onRecoverableError:recoverable});});
  expect(recoverable).not.toHaveBeenCalled();expect(errors).not.toHaveBeenCalled();
  expect(container.querySelector(".speech-switch")?.getAttribute("aria-checked")).toBe("true");
 } finally {await act(async()=>root?.unmount());container.remove();}
});
it("never reads a transcript aloud while interpreting it",()=>{
 const speech=browserSpeech(),coordinator=createEditorCoordinator();render(<Editor coordinator={coordinator}/>);speech.speak.mockClear();
 act(()=>coordinator.present({status:"interpreting",preview:null,text:"resume resume edit edit"}));
 expect(speech.speak).not.toHaveBeenCalled();
 act(()=>coordinator.present({status:"committed",preview:null,text:"Connected nodes."}));
 expect(speech.speak).toHaveBeenCalledTimes(1);expect(speech.speak.mock.calls[0][0].text).toBe("Connected nodes.");
});
it("uses natural default-label feedback and keeps custom labels",()=>{
 render(<Editor/>);fireEvent.click(screen.getByRole("button",{name:"Insert start"}));
 expect(screen.getByRole("region",{name:"Command feedback"})).toHaveTextContent("Added Start node.");
});
it("speaks a short navigation reply but retains visible and requested details",()=>{
 const speech=browserSpeech();
 render(<Editor/>);
 fireEvent.click(screen.getByRole("button",{name:"Insert process"}));
 fireEvent.click(screen.getByRole("button",{name:"Where am I"}));
 expect(speech.speak.mock.calls.at(-1)?.[0].text).toContain("Nothing attached");
 fireEvent.click(screen.getByRole("button",{name:"Focus Process"}));
 expect(speech.speak.mock.calls.at(-1)?.[0].text).toBe("Process");
 expect(screen.getByRole("region",{name:"Command feedback"})).toHaveTextContent("Focused Process.");
 fireEvent.click(screen.getByRole("button",{name:"Inspect focus"}));
 expect(speech.speak.mock.calls.at(-1)?.[0].text).not.toBe("Process");
});

it("names the connection when chart review opens its label editor",()=>{
 const speech=browserSpeech(),coordinator=createEditorCoordinator();
 coordinator.dispatch({type:"command",idSeed:"a",command:{kind:"add_node",type:"start",label:"Begin",placement:null}});
 coordinator.dispatch({type:"command",idSeed:"b",command:{kind:"connect_new",source:{kind:"focus"},type:"decision",label:"Approved?"}});
 coordinator.dispatch({type:"command",idSeed:"c",command:{kind:"connect_new",source:{kind:"focus"},type:"end",label:"Finish"}});
 render(<Editor coordinator={coordinator}/>);speech.speak.mockClear();
 fireEvent.click(screen.getByRole("button",{name:"Check chart"}));
 fireEvent.click(screen.getByRole("button",{name:"Next issue"}));
 fireEvent.click(screen.getByRole("button",{name:"Label connection"}));
 expect(speech.speak.mock.calls.at(-1)?.[0].text).toBe("Editing connection from Approved? to Finish.");
 expect(speech.speak.mock.calls.at(-1)?.[0].text).not.toBe("Selection cleared.");
});

it("stops a reply part-way and releases the microphone",()=>{
 vi.useFakeTimers();
 try {
  const speech=browserSpeech(),coordinator=createEditorCoordinator();render(<Editor coordinator={coordinator}/>);
  act(()=>coordinator.present({status:"committed",preview:null,text:"A long description of the whole chart."}));
  const stop=screen.getByRole("button",{name:"Stop speaking"});
  expect(stop).toBeEnabled();
  speech.cancel.mockClear();speech.speak.mockClear();
  fireEvent.click(stop);
  expect(speech.cancel).toHaveBeenCalled();
  // The reply must not start again: cancelling is the author's decision, not a failed attempt.
  expect(speech.speak).not.toHaveBeenCalled();
  // The echo guard still runs, and once it lapses there is nothing left to stop.
  act(()=>{vi.advanceTimersByTime(500);});
  expect(screen.getByRole("button",{name:"Stop speaking"})).toBeDisabled();
 } finally { vi.useRealTimers(); }
});
