import { describe, expect, it, vi } from "vitest";
import { TurnCoordinator, type Presentation, type Interpret } from "./turns";
import { createEngineState, execute, resolveClarification } from "../commands/execute";
import { previewCommand } from "../commands/preview";
import { parseControl } from "../commands/fast-path";
import type { GraphCommand } from "../commands/schema";
const add=(label:string):GraphCommand=>({kind:"add_node",type:"process",label,placement:null});
function deferred<T>() {let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}
function harness(interpret:Interpret=async text=>add(text)) {
 let state=createEngineState(),count=0;
 const presentations:Presentation[]=[];
 const apply=vi.fn((command:GraphCommand)=>{const result=execute(state,command,()=>`n${++count}`);state=result.state;return result;});
 const choose=vi.fn((id:string)=>{const result=resolveClarification(state,id,()=>`n${++count}`);state=result.state;return result;});
 const interpretSpy=vi.fn(interpret);
 const coordinator=new TurnCoordinator({getState:()=>state,apply,choose,interpret:interpretSpy,present:p=>presentations.push(p)});
 coordinator.start("s1");
 return {coordinator,apply,choose,interpret:interpretSpy,getState:()=>state,presentations,turn:(text:string,final=false,turnId="1",sessionId="s1")=>coordinator.accept({text,final,turnId,sessionId})};
}
describe("speech turn coordination",()=>{
 it("replaces partial previews without changing graph or history",async()=>{
  const h=harness(),before=h.getState();await h.turn("add a start called Begin");await h.turn("add a decision called Approved");
  expect(h.presentations.at(-1)?.preview).toMatchObject({type:"decision",label:"Approved"});expect(h.getState()).toBe(before);expect(h.apply).not.toHaveBeenCalled();expect(h.interpret).not.toHaveBeenCalled();
 });
 it("incomplete or unrecognized revisions clear the previous preview",async()=>{const h=harness();await h.turn("add a start called Begin");await h.turn("add a");expect(h.presentations.at(-1)?.preview).toBeNull();});
 it("dispatches only finals and deduplicates repeated final and late partial messages",async()=>{const h=harness();await h.turn("Begin",true);await h.turn("Begin",true);await h.turn("add a start called Late");expect(h.apply).toHaveBeenCalledTimes(1);expect(h.getState().graph.nodes).toHaveLength(1);expect(h.presentations.at(-1)?.preview).toBeNull();});
 it("serializes final interpretation and supplies the preceding committed state",async()=>{const wait=deferred<GraphCommand>();const h=harness(async(text,state)=>{if(text==="first")return wait.promise;expect(state.graph.nodes).toHaveLength(1);return add("Second");});const first=h.turn("first",true,"1"),second=h.turn("second",true,"2");await Promise.resolve();expect(h.interpret).toHaveBeenCalledTimes(1);wait.resolve(add("First"));await Promise.all([first,second]);expect(h.getState().graph.nodes.map(n=>n.label)).toEqual(["First","Second"]);});
 it("rejects an interpretation made stale by a manual edit",async()=>{const wait=deferred<GraphCommand>(),h=harness(()=>wait.promise);const final=h.turn("voice",true);await Promise.resolve();h.apply(add("Manual"));wait.resolve(add("Stale"));await final;expect(h.getState().graph.nodes.map(n=>n.label)).toEqual(["Manual"]);expect(h.presentations.at(-1)?.status).toBe("error");});
 it("rejects an interpretation made stale by changing focus without graph mutation",async()=>{const wait=deferred<GraphCommand>(),h=harness(()=>wait.promise);h.apply(add("One"));const final=h.turn("rename that",true);await Promise.resolve();h.apply({kind:"clear_focus"});wait.resolve(add("Wrong"));await final;expect(h.getState().graph.nodes).toHaveLength(1);expect(h.presentations.at(-1)?.status).toBe("error");});
 it("aborts stopped sessions and ignores late interpretation and late turns",async()=>{const wait=deferred<GraphCommand>(),h=harness(()=>wait.promise);const final=h.turn("voice",true);await Promise.resolve();h.coordinator.stop();expect(h.interpret.mock.calls[0][2].aborted).toBe(true);wait.resolve(add("Late"));await final;await h.turn("Again",true,"2");expect(h.apply).not.toHaveBeenCalled();expect(h.presentations.at(-1)).toMatchObject({status:"idle",preview:null});});
 it("new sessions do not wait for old requests and may reuse turn IDs",async()=>{const wait=deferred<GraphCommand>(),h=harness(text=>text==="old"?wait.promise:Promise.resolve(add("New")));const old=h.turn("old",true);await Promise.resolve();h.coordinator.start("s2");await h.turn("new",true,"1","s2");wait.resolve(add("Old"));await old;expect(h.getState().graph.nodes.map(n=>n.label)).toEqual(["New"]);});
 it("runs exact controls locally without interpreting them",async()=>{const h=harness();h.apply(add("One"));await h.turn("undo",true);expect(h.getState().graph.nodes).toHaveLength(0);expect(h.interpret).not.toHaveBeenCalled();expect(parseControl("undo and add something")).toBeNull();});
 it("resumes original clarification using a candidate ID rather than a new interpreted edit",async()=>{const h=harness();h.apply(add("Same"));h.apply(add("Same"));h.apply({kind:"rename",node:{kind:"label",value:"Same"},newLabel:"Resolved"});await h.turn("n2",true);expect(h.choose).toHaveBeenCalledWith("n2");expect(h.interpret).not.toHaveBeenCalled();expect(h.getState().graph.nodes[1].label).toBe("Resolved");});
 it("keeps ambiguous clarification replies pending",async()=>{const h=harness();h.apply(add("Same"));h.apply(add("Same"));h.apply({kind:"focus",node:{kind:"label",value:"Same"}});await h.turn("Same",true);expect(h.getState().pending?.kind).toBe("clarification");expect(h.presentations.at(-1)?.status).toBe("needs_clarification");});
 it("clears previews and preserves graph on malformed provider output",async()=>{const h=harness(async()=>({kind:"erase_everything"}) as unknown as GraphCommand);await h.turn("add a start called Begin");await h.turn("bad",true);expect(h.getState().graph.nodes).toHaveLength(0);expect(h.presentations.at(-1)).toMatchObject({status:"error",preview:null});});
 it("recovers the queue after provider failure",async()=>{const h=harness(async text=>{if(text==="bad")throw new Error("Unavailable");return add("Good");});await h.turn("bad",true,"1");await h.turn("good",true,"2");expect(h.getState().graph.nodes[0].label).toBe("Good");});
 it("previews conservatively and never treats controls as edits",()=>{expect(previewCommand("delete Begin")).toBeNull();expect(previewCommand("add a start called Begin and connect it")).toBeNull();expect(previewCommand('add a start called "Begin"')).toMatchObject({label:"Begin"});});
});
