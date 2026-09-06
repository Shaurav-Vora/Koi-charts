import { commandEnvelopeSchema } from "../commands/schema";
import type { Interpret } from "../streaming/turns";
export const interpretOnServer:Interpret=async(transcript,state,signal)=>{
 const response=await fetch("/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},signal,body:JSON.stringify({transcript,graph:state.graph,focusedNodeId:state.focusedNodeId,recentNodeId:state.recentNodeId,pending:state.pending})});
 if(!response.ok){throw new Error(response.status===503?"Voice editing is not configured. Set the server API key.":response.status===429?"Too many requests. Please wait a minute.":"Could not interpret the command. Please try again.");}
 const parsed=commandEnvelopeSchema.safeParse(await response.json());if(!parsed.success)throw new Error("The server returned an invalid command.");return parsed.data.command;
};
