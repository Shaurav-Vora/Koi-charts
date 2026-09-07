import { interpretOnServer } from "./interpret-client";
import { localCommandPreference } from "./preference";
import { createEditorState, editorReducer, type EditorAction } from "./reducer";
import { TurnCoordinator, type Interpret, type Presentation } from "../streaming/turns";
import type { CommandResult } from "../graph/types";
export function createEditorCoordinator(interpret:Interpret=interpretOnServer) {
 let state={editor:createEditorState(),presentation:null as Presentation|null};
 const listeners=new Set<()=>void>();
 const publish=()=>listeners.forEach(listener=>listener());
 const dispatch=(action:EditorAction)=>{state={...state,editor:editorReducer(state.editor,action),presentation:null};publish();};
 const result=():CommandResult=>({state:state.editor.engine,outcome:state.editor.outcome==="idle"?"error":state.editor.outcome,message:state.editor.message});
 const turns=new TurnCoordinator({getState:()=>state.editor.engine,interpret,preferLocal:localCommandPreference.read,
  apply:command=>{dispatch({type:"command",command,idSeed:crypto.randomUUID()});return result();},
  choose:candidateId=>{dispatch({type:"choose",candidateId,idSeed:crypto.randomUUID()});return result();},
  present:presentation=>{state={...state,presentation};publish();},
 });
 // The connection layer reports through the same channel as turns, so one status line covers both.
 const present=(value:Presentation)=>{state={...state,presentation:value};publish();};
 return {turns,dispatch,present,getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
