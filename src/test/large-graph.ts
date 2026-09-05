import type { FlowGraph } from "../graph/types";
export function largeGraph(): FlowGraph {
  return { schemaVersion: 1, nodes: Array.from({length:32},(_,i)=>({id:`example-${String(i).padStart(2,"0")}`,type:i===0?"start":i===31?"end":i%5===0?"decision":"process",label:i===0?"Begin":i===31?"Finish":`Step ${i}`, ...(i?{placement:{relation:"right_of" as const,referenceNodeId:`example-${String(i-1).padStart(2,"0")}`}}:{})})), edges:Array.from({length:31},(_,i)=>({id:`example-edge-${i}`,source:`example-${String(i).padStart(2,"0")}`,target:`example-${String(i+1).padStart(2,"0")}`,label:"next"})) };
}
