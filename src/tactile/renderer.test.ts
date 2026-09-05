import { describe, expect, it } from "vitest";
import { makeTactileFrame } from "./rasterize";
import { layoutGraph } from "../visual/layout";
import { largeGraph } from "../test/large-graph";
import { toBraille } from "./braille";
import { selectViewport, needsFocus } from "./viewport";
import { createEditorState, editorReducer } from "../editor/reducer";
import type { FlowGraph } from "../graph/types";
const graph:FlowGraph={schemaVersion:1,nodes:[{id:"a",type:"start",label:"Begin"},{id:"b",type:"process",label:"Check"},{id:"c",type:"decision",label:"Approved"},{id:"d",type:"end",label:"Finish"}],edges:[{id:"ab",source:"a",target:"b"},{id:"bc",source:"b",target:"c"},{id:"cd",source:"c",target:"d"}]};
describe("tactile renderer",()=>{
 it("renders deterministic bounded integer pins without mutating the graph",()=>{const before=structuredClone(graph),layout=layoutGraph(graph);const frame=makeTactileFrame(graph,layout,"c","overview",4);expect(frame).toEqual(makeTactileFrame(graph,layout,"c","overview",4));expect(frame.raisedPins.length).toBeGreaterThan(100);expect(frame.raisedPins.every(p=>Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=0&&p.x<120&&p.y>=0&&p.y<80)).toBe(true);expect(graph).toEqual(before);expect(frame.version).toBe(4);});
 it("shows only focus and direct neighbors with their connecting edges",()=>{const view=selectViewport(graph,layoutGraph(graph),"b","focus");expect(view.nodes.map(n=>n.id)).toEqual(["a","b","c"]);expect(view.edges.map(e=>e.id)).toEqual(["ab","bc"]);});
 it("uses a stable fallback focus and automatically detects dense charts",()=>{expect(selectViewport(graph,layoutGraph(graph),null,"focus").focusedNodeId).toBe("a");const big=largeGraph();expect(needsFocus(big,layoutGraph(big))).toBe(true);expect(selectViewport(big,layoutGraph(big),"example-15","focus").nodes).toHaveLength(3);});
 it("clears pins and labels for the empty chart",()=>{const empty:FlowGraph={schemaVersion:1,nodes:[],edges:[]};expect(makeTactileFrame(empty,layoutGraph(empty),null,"overview",0)).toMatchObject({raisedPins:[],focusedNodeId:null,brailleCells:"",text:"No node selected"});});
 it.each(["start","process","decision","end"] as const)("draws %s with a focused central cross",type=>{const single:FlowGraph={schemaVersion:1,nodes:[{id:"one",type,label:"One"}],edges:[]};const frame=makeTactileFrame(single,layoutGraph(single),"one","overview",1);expect(frame.raisedPins).toEqual(expect.arrayContaining([{x:60,y:40},{x:58,y:40},{x:60,y:38}]));});
 it("adds arrowhead pins beside the connection shaft",()=>{const layout={nodes:[{id:"a",x:0,y:0,width:20,height:20},{id:"b",x:80,y:0,width:20,height:20}],edges:[{id:"ab",points:[{x:20,y:10},{x:80,y:10}]}]};const pair:FlowGraph={schemaVersion:1,nodes:graph.nodes.slice(0,2),edges:graph.edges.slice(0,1)};const frame=makeTactileFrame(pair,layout,"a","overview",1);expect(frame.raisedPins.some(p=>p.x>88&&p.x<93&&p.y!==40)).toBe(true);});
 it("supports capitalization and number markers while disclosing unsupported characters",()=>{expect(toBraille("A 12").cells).toBe("⠠⠁⠀⠼⠁⠃");expect(toBraille("12a").cells).toBe("⠼⠁⠃⠰⠁");expect(toBraille("Hi🙂?").unsupported).toEqual(["🙂","?"]);});
 it("preserves display IDs across rename, deletion and undo",()=>{let state=createEditorState();state=editorReducer(state,{type:"command",idSeed:"a",command:{kind:"add_node",type:"process",label:"One",placement:null}});const id=state.engine.focusedNodeId!;const display=state.displayIds[id];state=editorReducer(state,{type:"command",idSeed:"b",command:{kind:"rename",node:{kind:"id",value:id},newLabel:"Two"}});state=editorReducer(state,{type:"command",idSeed:"c",command:{kind:"delete",target:{kind:"node",node:{kind:"id",value:id}}}});expect(state.displayIds[id]).toBe(display);state=editorReducer(state,{type:"command",idSeed:"d",command:{kind:"undo"}});expect(state.displayIds[id]).toBe(display);expect(state.engine.graph.nodes[0].label).toBe("Two");});
 it("loads the large example as one undoable change and never overwrites a chart",()=>{let state=editorReducer(createEditorState(),{type:"example"});expect(state.engine.graph.nodes).toHaveLength(32);expect(editorReducer(state,{type:"example"})).toBe(state);state=editorReducer(state,{type:"command",idSeed:"u",command:{kind:"undo"}});expect(state.engine.graph.nodes).toHaveLength(0);state=editorReducer(state,{type:"command",idSeed:"r",command:{kind:"redo"}});expect(state.engine.graph.nodes).toHaveLength(32);expect(state.displayIds["example-00"]).toBe("N1");});
});

it("isolates adapter mutation and failures from the input frame", async()=>{
  const {createSimulatorAdapter}=await import("./adapter");
  const frame=makeTactileFrame(graph,layoutGraph(graph),"a","overview",3),before=structuredClone(frame);
  await expect(createSimulatorAdapter(received=>{received.raisedPins.length=0;throw new Error("Display disconnected");}).render(frame)).rejects.toThrow("Display disconnected");
  expect(frame).toEqual(before);
});
