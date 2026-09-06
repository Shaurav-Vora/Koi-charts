import { commandEnvelopeSchema } from "../commands/schema";
import type { Interpret } from "../streaming/turns";
export const interpretOnServer:Interpret=async(transcript,state,signal)=>{
 const response=await fetch("/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},signal,body:JSON.stringify({transcript,graph:state.graph,focusedNodeId:state.focusedNodeId,recentNodeId:state.recentNodeId,pending:state.pending})});
 // The route returns reader-safe messages naming what to fix; a generic fallback hides them.
 if(!response.ok){
  const detail=await response.json().catch(()=>null) as {error?:{message?:unknown}}|null;
  throw new Error(typeof detail?.error?.message==="string"?detail.error.message:response.status===429?"Too many requests. Please wait a minute.":"Could not interpret the command. Please try again.");
 }
 const parsed=commandEnvelopeSchema.safeParse(await response.json());if(!parsed.success)throw new Error("The server returned an invalid command.");return parsed.data.command;
};
