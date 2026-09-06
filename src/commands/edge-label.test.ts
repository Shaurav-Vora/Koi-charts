import { describe, expect, it } from "vitest";
import { createEngineState, execute } from "./execute";
import { commandSchema } from "./schema";
import { commandJsonSchema } from "./json-schema";
import Ajv from "ajv";
describe("connection labels",()=>{
 it("updates one arrow in place and supports undo/redo and clearing",()=>{
 let state=createEngineState();let n=0;const run=(command:unknown)=>{const result=execute(state,command,()=>String(++n));expect(result.outcome).not.toBe("error");state=result.state;};
 run({kind:"add_node",type:"decision",label:"Approved?",placement:null});run({kind:"add_node",type:"end",label:"Finish",placement:null});run({kind:"connect",source:{kind:"id",value:"1"},target:{kind:"id",value:"2"},label:null});
 const before=structuredClone(state.graph.nodes);run({kind:"label_edge",edgeId:"3",label:"Yes"});expect(state.graph.edges).toEqual([{id:"3",source:"1",target:"2",label:"Yes"}]);expect(state.graph.nodes).toEqual(before);
 run({kind:"undo"});expect(state.graph.edges[0].label).toBeUndefined();run({kind:"redo"});expect(state.graph.edges[0].label).toBe("Yes");run({kind:"label_edge",edgeId:"3",label:null});expect(state.graph.edges[0].label).toBeUndefined();
 });
 it("rejects missing arrows and agrees in both command validators",()=>{const command={kind:"label_edge",edgeId:"missing",label:"No"};expect(commandSchema.safeParse(command).success).toBe(true);expect(new Ajv({strict:false}).compile(commandJsonSchema)({command})).toBe(true);expect(execute(createEngineState(),command,()=>"id").outcome).toBe("error");});
});
