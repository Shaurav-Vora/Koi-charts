import { expect, it } from "vitest";
import { createEditorState, editorReducer } from "./reducer";
import { briefReply } from "./brief-reply";

function chart() {
 let state = createEditorState();
 state = editorReducer(state, {type:"command",idSeed:"a",command:{kind:"add_node",type:"start",label:"Start",placement:null}});
 state = editorReducer(state, {type:"command",idSeed:"b",command:{kind:"add_node",type:"process",label:"Review. Then approve",placement:null}});
 return editorReducer(state,{type:"command",idSeed:"c",command:{kind:"connect",source:{kind:"id",value:"a-1"},target:{kind:"id",value:"b-1"},label:null}});
}
it("speaks only the destination label after navigating, retaining the full visible report", () => {
 const start = editorReducer(chart(),{type:"command",idSeed:"d",command:{kind:"walk",direction:"first",branch:null}});
 const next = editorReducer(start,{type:"command",idSeed:"e",command:{kind:"walk",direction:"next",branch:null}});
 expect(next.message).toContain("way back");
 expect(briefReply(next,next.message)).toBe("Review. Then approve");
 const focus = editorReducer(next,{type:"command",idSeed:"f",command:{kind:"focus",node:{kind:"id",value:"a-1"}}});
 expect(briefReply(focus,focus.message)).toBe("Start");
 expect(briefReply(focus,"Connection lost. Try again.")).toBe("Connection lost. Try again.");
});
it("keeps explicit details, errors and branch choices intact", () => {
 const state = chart();
 for(const command of [
  {kind:"inspect",node:null},
  {kind:"describe",scope:"chart"},
  {kind:"walk",direction:"stay",branch:null},
  {kind:"connect",source:{kind:"focus"},target:{kind:"focus"},label:null},
 ] as const) {
  const result = editorReducer(state,{type:"command",idSeed:"d",command});
  expect(briefReply(result,result.message)).toBe(result.message);
 }
 const fork = {...state,outcome:"explored" as const,message:'Choose Yes or No. Say "take" and the name to choose.'};
 expect(briefReply(fork,fork.message)).toBe(fork.message);
});
