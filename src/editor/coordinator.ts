import { createEditorState, editorReducer, type EditorAction } from "./reducer";
import { TurnCoordinator, type Interpret, type Presentation } from "../streaming/turns";
import type { CommandResult } from "../graph/types";
export function createEditorCoordinator(interpret:Interpret=async()=>{throw new Error("Voice interpretation is not connected yet.");}) {
 let state={editor:createEditorState(),presentation:null as Presentation|null};
 const listeners=new Set<()=>void>();
 const publish=()=>listeners.forEach(listener=>listener());
 const dispatch=(action:EditorAction)=>{state={...state,editor:editorReducer(state.editor,action),presentation:null};publish();};
 const result=():CommandResult=>({state:state.editor.engine,outcome:state.editor.outcome==="idle"?"error":state.editor.outcome,message:state.editor.message});
 const turns=new TurnCoordinator({getState:()=>state.editor.engine,interpret,
  apply:command=>{dispatch({type:"command",command,idSeed:crypto.randomUUID()});return result();},
  choose:candidateId=>{dispatch({type:"choose",candidateId,idSeed:crypto.randomUUID()});return result();},
  present:presentation=>{state={...state,presentation};publish();},
 });
 return {turns,dispatch,getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
