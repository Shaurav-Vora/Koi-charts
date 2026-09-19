import { describe, expect, it } from "vitest";
import { parseLocal } from "./local";
import { createEngineState, execute } from "./execute";

const byLabel = (value:string) => ({kind:"label",value}) as const;
const byShortId = (value:string) => ({kind:"id",value}) as const;
const edgeBetween = (source:ReturnType<typeof byLabel>|ReturnType<typeof byShortId>, target:ReturnType<typeof byLabel>|ReturnType<typeof byShortId>) => ({kind:"edge",source,target,label:null}) as const;

describe("spoken connection labels",()=>{
 it.each([
  ["Label connection from Approved to Finish as Yes.",{kind:"label_edge",target:edgeBetween(byLabel("Approved"),byLabel("Finish")),label:"Yes"}],
  ["Label arrow from node one to N 2 as No.",{kind:"label_edge",target:edgeBetween(byShortId("N1"),byShortId("N2")),label:"No"}],
  ["Clear label on connection from N1 to node two.",{kind:"label_edge",target:edgeBetween(byShortId("N1"),byShortId("N2")),label:null}],
 ] as const)("parses %s locally",(spoken,command)=>expect(parseLocal(spoken)).toEqual(command));

 it("labels by endpoint names as one undoable edit",()=>{
  let state=createEngineState(),id=0;
  const run=(command:unknown)=>{const result=execute(state,command,()=>String(++id));state=result.state;return result;};
  run({kind:"add_node",type:"decision",label:"Approved",placement:null});
  run({kind:"add_node",type:"end",label:"Finish",placement:null});
  run({kind:"connect",source:byLabel("Approved"),target:byLabel("Finish"),label:null});
  const result=run({kind:"label_edge",target:edgeBetween(byLabel("Approved"),byLabel("Finish")),label:"Yes"});
  expect(result).toMatchObject({outcome:"committed",message:"Labeled connection from Approved to Finish as Yes."});
  expect(state.graph.edges[0].label).toBe("Yes");
  run({kind:"undo"});expect(state.graph.edges[0].label).toBeUndefined();
  run({kind:"redo"});expect(state.graph.edges[0].label).toBe("Yes");
 });

 it("asks which parallel connection to label instead of guessing",()=>{
  let state=createEngineState(),id=0;
  const run=(command:unknown)=>{const result=execute(state,command,()=>String(++id));state=result.state;return result;};
  run({kind:"add_node",type:"decision",label:"Approved",placement:null});
  run({kind:"add_node",type:"end",label:"Finish",placement:null});
  run({kind:"connect",source:byLabel("Approved"),target:byLabel("Finish"),label:"Yes"});
  run({kind:"connect",source:byLabel("Approved"),target:byLabel("Finish"),label:"No"});
  const before=structuredClone(state.graph);
  const result=run({kind:"label_edge",target:edgeBetween(byLabel("Approved"),byLabel("Finish")),label:"Maybe"});
  expect(result.outcome).toBe("clarification");
  expect(result.state.pending).toMatchObject({kind:"clarification",elementKind:"edge",candidates:expect.arrayContaining(["3","4"])});
  expect(result.state.graph).toEqual(before);
 });
});