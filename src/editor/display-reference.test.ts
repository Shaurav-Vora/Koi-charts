import { expect, it } from "vitest";
import { parseLocal } from "../commands/local";
import { createEditorState, editorReducer } from "./reducer";

it("uses stable short node references while retaining full labels",()=>{
 let state=createEditorState();
 state=editorReducer(state,{type:"command",idSeed:"start",command:{kind:"add_node",type:"start",label:"Request received",placement:null}});
 expect(state.message).toBe("Added start Request received, node 1.");
 state=editorReducer(state,{type:"command",idSeed:"review",command:{kind:"add_node",type:"process",label:"Review application",placement:null}});
 expect(state.displayIds).toMatchObject({"start-1":"N1","review-1":"N2"});
 const connect=parseLocal("Connect node one to N 2.");
 expect(connect).not.toBeNull();
 state=editorReducer(state,{type:"command",idSeed:"edge",command:connect!});
 expect(state.engine.graph.edges).toEqual([{id:"edge-1",source:"start-1",target:"review-1"}]);
 const rename=parseLocal("Rename N2 to Review request.");
 expect(rename).not.toBeNull();
 state=editorReducer(state,{type:"command",idSeed:"rename",command:rename!});
 expect(state.engine.graph.nodes.find(node=>node.id==="review-1")?.label).toBe("Review request");
 expect(state.displayIds["review-1"]).toBe("N2");
});

it("labels a connection through short references",()=>{
 let state=createEditorState();
 state=editorReducer(state,{type:"command",idSeed:"a",command:{kind:"add_node",type:"decision",label:"A very long approval question",placement:null}});
 state=editorReducer(state,{type:"command",idSeed:"b",command:{kind:"add_node",type:"end",label:"A very long completion label",placement:null}});
 state=editorReducer(state,{type:"command",idSeed:"c",command:parseLocal("Connect node 1 to node 2.")!});
 state=editorReducer(state,{type:"command",idSeed:"d",command:parseLocal("Label connection from N1 to N2 as Yes.")!});
 expect(state.engine.graph.edges[0].label).toBe("Yes");
 expect(state.message).toBe("Labeled connection from A very long approval question to A very long completion label as Yes.");
});

it("retains short references through clear, undo, and redo",()=>{
 let state=createEditorState();
 state=editorReducer(state,{type:"command",idSeed:"a",command:{kind:"add_node",type:"start",label:"Begin",placement:null}});
 state=editorReducer(state,{type:"command",idSeed:"b",command:{kind:"add_node",type:"process",label:"Review",placement:null}});
 state=editorReducer(state,{type:"clear"});
 expect(state.displayIds).toMatchObject({"a-1":"N1","b-1":"N2"});
 state=editorReducer(state,{type:"command",idSeed:"undo",command:{kind:"undo"}});
 expect(state.displayIds["b-1"]).toBe("N2");
 state=editorReducer(state,{type:"command",idSeed:"redo",command:{kind:"redo"}});
 expect(state.engine.graph.nodes).toHaveLength(0);
 state=editorReducer(state,{type:"command",idSeed:"undo-again",command:{kind:"undo"}});
 expect(state.displayIds["b-1"]).toBe("N2");
 state=editorReducer(state,{type:"command",idSeed:"rename",command:parseLocal("Rename node 2 to Check.")!});
 expect(state.engine.graph.nodes.find(node=>node.id==="b-1")?.label).toBe("Check");
});