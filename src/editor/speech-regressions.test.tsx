import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import Editor from "./Editor";
import { createEditorCoordinator } from "./coordinator";
vi.mock("../visual/VisualCanvas",()=>({default:()=>null}));
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
 const before=container.querySelector(".speech-button");expect(before?.getAttribute("aria-pressed")).toBe("false");
 browserSpeech();const recoverable=vi.fn(),errors=vi.spyOn(console,"error").mockImplementation(()=>{});let root:Root;
 try {
  await act(async()=>{root=hydrateRoot(container,<Editor/>,{onRecoverableError:recoverable});});
  expect(recoverable).not.toHaveBeenCalled();expect(errors).not.toHaveBeenCalled();
  expect(container.querySelector(".speech-button")?.getAttribute("aria-pressed")).toBe("true");
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
