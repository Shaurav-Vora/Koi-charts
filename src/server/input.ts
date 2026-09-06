import { z } from "zod";
import { assertGraph } from "../graph/invariants";
import { commandSchema } from "../commands/schema";
import type { FlowGraph } from "../graph/types";
import { ApiError } from "./errors";
const id=z.string().min(1).max(200);
const graph=z.unknown().transform((value,ctx)=>{try{assertGraph(value);if(value.nodes.length>100||value.edges.length>200)throw new Error();return value;}catch{ctx.addIssue({code:"custom",message:"Invalid or oversized graph"});return z.NEVER;}});
const snapshot=z.strictObject({graph,focusedNodeId:id.nullable(),recentNodeId:id.nullable()});
const pending=z.discriminatedUnion("kind",[
 z.strictObject({kind:z.literal("clarification"),command:commandSchema,referencePath:z.string().max(500),candidates:z.array(id).max(200),graphVersion:z.number().int().nonnegative(),elementKind:z.enum(["node","edge"]),allocatedIds:z.array(id).max(20),context:z.strictObject({focusedNodeId:id.nullable(),recentNodeId:id.nullable()})}),
 z.strictObject({kind:z.literal("deletion"),command:commandSchema,nodeIds:z.array(id).max(100),incidentEdgeIds:z.array(id).max(200),graphVersion:z.number().int().nonnegative(),prepared:snapshot}),
]).nullable();
const schema=z.strictObject({transcript:z.string().trim().min(1).max(2000),graph,focusedNodeId:id.nullable(),recentNodeId:id.nullable(),pending});
export type InterpretationInput=z.infer<typeof schema>;
export function parseInput(value:unknown):InterpretationInput{
 const result=schema.safeParse(value);if(!result.success)throw new ApiError("INVALID_INPUT","Invalid transcript or chart context.");
 for(const id of [result.data.focusedNodeId,result.data.recentNodeId])if(id!==null&&!result.data.graph.nodes.some(n=>n.id===id))throw new ApiError("INVALID_INPUT","A selected node no longer exists.");
 return result.data;
}
export function semanticGraph(graph:FlowGraph){return {schemaVersion:graph.schemaVersion,nodes:graph.nodes.map(({id,type,label,placement})=>({id,type,label,...(placement?{placement}:{})})),edges:graph.edges};}
export function providerContext(input:InterpretationInput){
 const p=input.pending;
 // Pending manual moves may contain pixels; the provider only needs semantic context.
 const command=p?JSON.parse(JSON.stringify(p.command,(key,value)=>key==="position"?undefined:value)):null;
 return {...input,graph:semanticGraph(input.graph),pending:p?.kind==="deletion"?{kind:p.kind,command,nodeIds:p.nodeIds,incidentEdgeIds:p.incidentEdgeIds}:p?.kind==="clarification"?{kind:p.kind,command,candidates:p.candidates,elementKind:p.elementKind}:null};
}
