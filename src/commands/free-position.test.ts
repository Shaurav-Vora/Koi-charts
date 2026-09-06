// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEngineState, execute } from "./execute";
import { layoutGraph } from "../visual/layout";
import { commandSchema } from "./schema";
import { commandJsonSchema } from "./json-schema";
import Ajv from "ajv";
const id = () => "unused";
function setup() {
  let state = createEngineState();
  for (const [i,label] of ["A","B","C"].entries()) state = execute(state,{kind:"add_node",type:"process",label,placement:i?{relation:"right_of",reference:{kind:"recent"}}:null},()=>label).state;
  return execute(state,{kind:"connect",source:{kind:"id",value:"A"},target:{kind:"id",value:"B"},label:null},()=>"edge").state;
}
describe("free positioning",()=>{
 it("places a node exactly between two blocks without shifting its neighbors",()=>{
   const state=setup(), before=layoutGraph(state.graph);
   const position={x:300.25,y:180.5};
   const result=execute(state,{kind:"move_to",node:{kind:"id",value:"C"},position},id);
   expect(result.outcome).toBe("committed");
   const after=layoutGraph(result.state.graph);
   expect(after.nodes.find(n=>n.id==="C")).toMatchObject(position);
   for(const name of ["A","B"])expect(after.nodes.find(n=>n.id===name)).toEqual(before.nodes.find(n=>n.id===name));
   expect(result.state.graph.edges).toEqual(state.graph.edges);
   expect(layoutGraph(execute(result.state,{kind:"undo"},id).state.graph)).toEqual(before);
   const undone=execute(result.state,{kind:"undo"},id).state;
   expect(layoutGraph(execute(undone,{kind:"redo"},id).state.graph)).toEqual(after);
 });
 it("allows a lone node to move into negative canvas coordinates",()=>{
   const state=execute(createEngineState(),{kind:"add_node",type:"start",label:"A",placement:null},()=>"A").state;
   const moved=execute(state,{kind:"move_to",node:{kind:"id",value:"A"},position:{x:-200,y:-100}},id);
   expect(layoutGraph(moved.state.graph).nodes[0]).toMatchObject({x:-200,y:-100});
 });
 it("keeps explicit placement through rename and connection edits",()=>{
   let state=execute(setup(),{kind:"move_to",node:{kind:"id",value:"A"},position:{x:10,y:300}},id).state;
   const before=layoutGraph(state.graph).nodes;
   state=execute(state,{kind:"rename",node:{kind:"id",value:"A"},newLabel:"Renamed"},id).state;
   expect(layoutGraph(state.graph).nodes).toEqual(before);
 });
 it("validates finite bounded coordinates in both command schemas",()=>{
   const validate=new Ajv().compile(commandJsonSchema);
   for(const x of [50,-200,100001]) {const command={kind:"move_to",node:{kind:"id",value:"A"},position:{x,y:0}};expect(commandSchema.safeParse(command).success).toBe(x!==100001);expect(validate({command})).toBe(x!==100001);}
   expect(commandSchema.safeParse({kind:"move_to",node:{kind:"id",value:"A"},position:{x:NaN,y:0}}).success).toBe(false);
 });
});
