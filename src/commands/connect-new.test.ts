import { expect, it } from "vitest";
import { parseLocal } from "./local";
import { createEngineState, execute, resolveClarification } from "./execute";

it.each(["connect it to a new node", "Connect Start to a new process node labelled Review.", 'connect Start to a new process called "Review and approve"'])("creates and connects atomically: %s", phrase => {
 const before = execute(createEngineState(),{kind:"add_node",type:"start",label:"Start",placement:null},()=>"start").state;
 let serial=0;
 const result=execute(before,parseLocal(phrase),()=>`new-${++serial}`);
 expect(result.outcome).toBe("committed");
 expect(result.state.graph.nodes).toHaveLength(2);
 expect(result.state.graph.edges).toEqual([{id:"new-2",source:"start",target:"new-1"}]);
 expect(result.state.focusedNodeId).toBe("new-1");
 expect(execute(result.state,{kind:"undo"},()=>"unused").state.graph).toEqual(before.graph);
});
it("resolves ambiguity before creation and resumes with the chosen source",()=>{
 const before={...createEngineState(),graph:{schemaVersion:1 as const,nodes:[{id:"a",type:"process" as const,label:"Same"},{id:"b",type:"process" as const,label:"Same"}],edges:[]}};
 let serial=0;
 const result=execute(before,parseLocal("connect Same to a new decision labelled Approved?"),()=>`new-${++serial}`);
 expect(result.outcome).toBe("clarification");
 expect(result.state.graph).toEqual(before.graph);
 const chosen=resolveClarification(result.state,"b",()=>`new-${++serial}`);
 expect(chosen.outcome).toBe("committed");
 expect(chosen.state.graph.edges[0].source).toBe("b");
 expect(chosen.state.graph.nodes.at(-1)?.label).toBe("Approved?");
});
it("does not create a destination when its source is missing",()=>{
 const before=createEngineState();
 const result=execute(before,parseLocal("connect Missing to a new decision"),()=>"unused");
 expect(result.outcome).toBe("error");
 expect(result.state).toEqual(before);
});
