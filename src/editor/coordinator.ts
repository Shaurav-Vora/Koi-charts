import { interpretOnServer } from "./interpret-client";
import { localCommandPreference } from "./preference";
import { createEditorState, editorReducer, type EditorAction } from "./reducer";
import { TurnCoordinator, type Interpret, type Presentation } from "../streaming/turns";
import type { CommandResult } from "../graph/types";
import { createPlaybackState, playbackTransition } from "../playback/engine";
import type { PlaybackAction } from "../playback/types";
export function createEditorCoordinator(interpret:Interpret=interpretOnServer) {
 let state={editor:createEditorState(),presentation:null as Presentation|null,playback:createPlaybackState()};
 const listeners=new Set<()=>void>();
 const publish=()=>listeners.forEach(listener=>listener());
 const dispatch=(action:EditorAction)=>{
  const previousVersion=state.editor.engine.version;
  const editor=editorReducer(state.editor,action);
  const playback=previousVersion!==editor.engine.version&&state.playback.status!=="idle"
   ?playbackTransition(editor.engine.graph,state.playback,{type:"graph_changed",graphVersion:editor.engine.version})
   :state.playback;
  state={...state,editor,presentation:null,playback};publish();
 };
 const playbackDispatch=(action:PlaybackAction)=>{
  const playback=playbackTransition(state.editor.engine.graph,state.playback,action);
  let editor=state.editor;
  if(playback.currentNodeId&&playback.currentNodeId!==editor.engine.focusedNodeId){
   editor=editorReducer(editor,{type:"command",idSeed:crypto.randomUUID(),command:{kind:"focus",node:{kind:"id",value:playback.currentNodeId}}});
  }
  state={...state,editor,presentation:null,playback};publish();
 };
 const result=():CommandResult=>({state:state.editor.engine,outcome:state.editor.outcome==="idle"?"error":state.editor.outcome,message:state.editor.message});
 const turns=new TurnCoordinator({getState:()=>state.editor.engine,interpret,preferLocal:localCommandPreference.read,
  apply:command=>{dispatch({type:"command",command,idSeed:crypto.randomUUID()});return result();},
  choose:candidateId=>{dispatch({type:"choose",candidateId,idSeed:crypto.randomUUID()});return result();},
  present:presentation=>{state={...state,presentation};publish();},
 });
 // The connection layer reports through the same channel as turns, so one status line covers both.
 const present=(value:Presentation)=>{state={...state,presentation:value};publish();};
 return {turns,dispatch,playbackDispatch,present,getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
