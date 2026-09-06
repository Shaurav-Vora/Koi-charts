import type { EngineState, CommandResult } from "../graph/types";
import { commandSchema, type GraphCommand } from "../commands/schema";
import { previewCommand } from "../commands/preview";
import { parseControl } from "../commands/fast-path";
import type { VoiceStatus } from "../editor/status";
export type Turn={sessionId:string;turnId:string;text:string;final:boolean};
export type Presentation={status:VoiceStatus;preview:GraphCommand|null;text:string;error?:string};
export type Interpret=(text:string,state:EngineState,signal:AbortSignal)=>Promise<GraphCommand>;
type Options={getState:()=>EngineState;apply:(command:GraphCommand)=>CommandResult;choose:(id:string)=>CommandResult;interpret:Interpret;present:(value:Presentation)=>void};
export class TurnCoordinator {
 private session:string|null=null;
 private generation=0;
 private finalized=new Set<string>();
 private tail:Promise<void>=Promise.resolve();
 private controllers=new Set<AbortController>();
 constructor(private options:Options){}
 start(sessionId:string){this.stop();this.session=sessionId;this.finalized.clear();this.options.present({status:"listening",preview:null,text:""});}
 stop(){this.generation++;this.session=null;for(const controller of this.controllers)controller.abort();this.controllers.clear();this.tail=Promise.resolve();this.options.present({status:"idle",preview:null,text:""});}
 accept(turn:Turn):Promise<void>{
  if(turn.sessionId!==this.session || !turn.turnId || this.finalized.has(turn.turnId))return Promise.resolve();
  if(!turn.final){const preview=previewCommand(turn.text);this.options.present({status:preview?"previewing":"speech_detected",preview,text:turn.text});return Promise.resolve();}
  this.finalized.add(turn.turnId);
  const generation=this.generation;
  this.options.present({status:"interpreting",preview:null,text:turn.text});
  const task=this.tail.then(()=>this.finish(turn,generation));
  this.tail=task.catch(()=>{});return task;
 }
 private async finish(turn:Turn,generation:number){
  if(generation!==this.generation)return;
  const controller=new AbortController();this.controllers.add(controller);
  const state=structuredClone(this.options.getState());
  // Focus and pending context matter even when graph version does not change.
  const context=(s:EngineState)=>JSON.stringify([s.version,s.focusedNodeId,s.recentNodeId,s.pending]);
  try {
   const control=parseControl(turn.text);
   let result:CommandResult;
   if(state.pending?.kind==="clarification" && !control){
    const reply=turn.text.trim();
    const candidates=state.pending.candidates.filter(id=>id===reply || (state.pending?.kind==="clarification" && state.pending.elementKind==="node" && state.graph.nodes.find(n=>n.id===id)?.label.toLowerCase()===reply.toLowerCase()));
    if(candidates.length!==1) {this.options.present({status:"needs_clarification",preview:null,text:"Choose one matching label or use a candidate button."});return;}
    result=this.options.choose(candidates[0]);
   }else{
    const command=control ?? await this.options.interpret(turn.text,state,controller.signal);
    if(generation!==this.generation || controller.signal.aborted)return;
    if(context(state)!==context(this.options.getState()))throw new Error("The chart or selection changed. Please repeat the command.");
    const parsed=commandSchema.safeParse(command);
    if(!parsed.success)throw new Error("The interpreted command was invalid. Please repeat or rephrase it.");
    result=this.options.apply(parsed.data);
   }
   if(generation!==this.generation)return;
   this.options.present({status:result.outcome==="error"?"error":result.outcome==="clarification"?"needs_clarification":result.outcome==="confirmation"?"confirming_delete":"committed",preview:null,text:result.message});
  }catch(error){if(generation===this.generation)this.options.present({status:"error",preview:null,text:"",error:error instanceof Error?error.message:"Command could not be applied."});}
  finally{this.controllers.delete(controller);}
 }
}
