import { interpretOnServer } from "./interpret-client";
import { localCommandPreference } from "./preference";
import { createEditorState, editorReducer, type EditorAction } from "./reducer";
import { TurnCoordinator, type Interpret, type Presentation } from "../streaming/turns";
import type { GraphCommand } from "../commands/schema";
import type { CommandResult, FlowGraph } from "../graph/types";
import { createPlaybackState, playbackTransition } from "../playback/engine";
import type { PlaybackAction } from "../playback/types";
import { auditTransition, createAuditState, currentAuditIssue } from "../audit/state";
import type { AuditAction, AuditState } from "../audit/types";
import type { ProjectAction, ProjectActionResult } from "../projects/ProjectControls";
export function createEditorCoordinator(interpret:Interpret=interpretOnServer) {
 let state={editor:createEditorState(),presentation:null as Presentation|null,playback:createPlaybackState(),audit:createAuditState(),projectImportKey:0};
 let projectRunner: ((action:ProjectAction)=>Promise<ProjectActionResult>|ProjectActionResult)|null=null;
 const listeners=new Set<()=>void>();
 const publish=()=>listeners.forEach(listener=>listener());
 const dispatch=(action:EditorAction)=>{
  const previousVersion=state.editor.engine.version;
  let editor=editorReducer(state.editor,action);
  const playback=previousVersion!==editor.engine.version&&state.playback.status!=="idle"
   ?playbackTransition(editor.engine.graph,state.playback,{type:"graph_changed",graphVersion:editor.engine.version})
   :state.playback;
  const audit=previousVersion!==editor.engine.version&&state.audit.status==="open"
   ?auditTransition(editor.engine.graph,state.audit,{type:"graph_changed",graphVersion:editor.engine.version})
   :state.audit;
  const auditFocus=currentAuditIssue(audit)?.target.focusNodeId;
  if(auditFocus&&editor.engine.graph.nodes.some(node=>node.id===auditFocus)&&auditFocus!==editor.engine.focusedNodeId){
   editor=editorReducer(editor,{type:"command",idSeed:crypto.randomUUID(),command:{kind:"focus",node:{kind:"id",value:auditFocus}}});
  }
  state={...state,editor,presentation:null,playback,audit};publish();
 };
 const result=():CommandResult=>({state:state.editor.engine,outcome:state.editor.outcome==="idle"?"error":state.editor.outcome,message:state.editor.message});
 const importProject=(graph:FlowGraph,filename:string):CommandResult=>{
  const editor=editorReducer(state.editor,{type:"import_project",graph,filename});
  if(editor.outcome!=="committed")return {state:state.editor.engine,outcome:"error",message:editor.message};
  state={...state,editor,presentation:null,playback:createPlaybackState(),audit:createAuditState(),projectImportKey:state.projectImportKey+1};publish();
  return result();
 };
 const openEditor=(target:{kind:"node";nodeId:string}|{kind:"edge";edgeId:string}):CommandResult=>{
  if(target.kind==="node"){
   const node=state.editor.engine.graph.nodes.find(candidate=>candidate.id===target.nodeId);
   if(!node)return {state:state.editor.engine,outcome:"error",message:"That node is no longer available."};
   dispatch({type:"interface_focus",focusedNodeId:node.id,message:`Editing ${node.label}.`});
  }else{
   const edge=state.editor.engine.graph.edges.find(candidate=>candidate.id===target.edgeId);
   const source=edge&&state.editor.engine.graph.nodes.find(node=>node.id===edge.source);
   const destination=edge&&state.editor.engine.graph.nodes.find(node=>node.id===edge.target);
   if(!edge||!source||!destination)return {state:state.editor.engine,outcome:"error",message:"That connection is no longer available."};
   dispatch({type:"interface_focus",focusedNodeId:null,message:`Editing connection from ${source.label} to ${destination.label}.`});
  }
  return result();
 };
 const playbackResult=(action:PlaybackAction):CommandResult=>({
  state:state.editor.engine,
  outcome:state.playback.status==="blocked"||(state.playback.status==="idle"&&action.type!=="stop")?"error"
   :state.playback.status==="choosing_start"||state.playback.status==="choosing_branch"?"clarification":"explored",
  message:state.playback.message,
 });
 const playbackDispatch=(action:PlaybackAction):CommandResult=>{
  const playback=playbackTransition(state.editor.engine.graph,state.playback,action);
  const audit=(action.type==="start"||action.type==="restart")&&state.audit.status==="open"?createAuditState():state.audit;
  let editor=state.editor;
  if(playback.currentNodeId&&playback.currentNodeId!==editor.engine.focusedNodeId){
   editor=editorReducer(editor,{type:"command",idSeed:crypto.randomUUID(),command:{kind:"focus",node:{kind:"id",value:playback.currentNodeId}}});
  }
  state={...state,editor,presentation:null,playback,audit};publish();
  return playbackResult(action);
 };
 const auditResult=(audit:AuditState,outcome:CommandResult["outcome"]="explored"):CommandResult=>({
  state:state.editor.engine,outcome,message:audit.message,
 });
 const auditDispatch=(action:AuditAction):CommandResult=>{
  const wasClosed=state.audit.status==="closed";
  const audit=auditTransition(state.editor.engine.graph,state.audit,action);
  let editor=state.editor;
  const focusId=currentAuditIssue(audit)?.target.focusNodeId;
  if(focusId&&editor.engine.graph.nodes.some(node=>node.id===focusId)&&focusId!==editor.engine.focusedNodeId){
   editor=editorReducer(editor,{type:"command",idSeed:crypto.randomUUID(),command:{kind:"focus",node:{kind:"id",value:focusId}}});
  }
  const playback=action.type==="open"&&state.playback.status!=="idle"?createPlaybackState():state.playback;
  state={...state,editor,presentation:null,playback,audit};publish();
  return auditResult(audit,wasClosed&&action.type!=="open"&&action.type!=="close"?"error":"explored");
 };
 const normalize=(value:string)=>value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const playbackFeedback=(message:string,outcome:"error"|"clarification"):CommandResult=>{
  state={...state,playback:{...state.playback,message},presentation:null};publish();
  return {state:state.editor.engine,outcome,message};
 };
 const choosePlayback=(spoken:string|null):CommandResult=>{
  if(state.playback.status==="paused"){
   const outgoing=state.editor.engine.graph.edges.filter(edge=>edge.source===state.playback.currentNodeId);
   if(outgoing.length>1)playbackDispatch({type:"next",graphVersion:state.editor.engine.version});
  }
  if(!spoken)return state.playback.status==="choosing_start"||state.playback.status==="choosing_branch"
   ?playbackResult({type:"repeat",graphVersion:state.editor.engine.version})
   :playbackFeedback("There is no choice to take here.","error");
  const wanted=normalize(spoken);
  if(state.playback.status==="choosing_start"){
   const matches=state.playback.choices.filter(choice=>normalize(choice.label)===wanted||normalize(choice.destinationLabel)===wanted);
   if(matches.length===1)return playbackDispatch({type:"choose_start",nodeId:matches[0].id,graphVersion:state.editor.engine.version});
   if(!matches.length)return playbackFeedback(`No Start node here is called ${spoken}.`,"error");
   return playbackFeedback(`Several Start nodes match ${spoken}. Say the full label.`,"clarification");
  }
  if(state.playback.status!=="choosing_branch")return playbackFeedback(`No branch here is called ${spoken}.`,"error");
  const choices=state.playback.choices;
  const edgeLabel=(id:string)=>state.editor.engine.graph.edges.find(edge=>edge.id===id)?.label??"";
  let matches=choices.filter(choice=>normalize(edgeLabel(choice.id))===wanted);
  if(!matches.length)matches=choices.filter(choice=>normalize(choice.destinationLabel)===wanted);
  if(!matches.length)matches=choices.filter(choice=>normalize(choice.label)===wanted);
  if(matches.length===1)return playbackDispatch({type:"choose_branch",edgeId:matches[0].id,graphVersion:state.editor.engine.version});
  if(!matches.length)return playbackFeedback(`No branch here is called ${spoken}.`,"error");
  return playbackFeedback(`Several branches match ${spoken}: ${matches.map(choice=>choice.label).join("; ")}. Say the destination.`,"clarification");
 };
 const applyCommand=(command:GraphCommand):CommandResult=>{
  if(command.kind==="audit")return auditDispatch({type:command.action,graphVersion:state.editor.engine.version});
  if(command.kind==="validate")return auditDispatch({type:"open",graphVersion:state.editor.engine.version});
  if(command.kind==="playback"){
   if(command.action==="choose")return choosePlayback(command.choice);
   return playbackDispatch({type:command.action,graphVersion:state.editor.engine.version});
  }
  if(state.playback.status!=="idle"&&command.kind==="walk"){
   if(command.branch)return choosePlayback(command.branch);
   const action=command.direction==="next"?"next":command.direction==="back"?"back":command.direction==="stay"?"repeat":null;
   if(action)return playbackDispatch({type:action,graphVersion:state.editor.engine.version});
  }
  dispatch({type:"command",command,idSeed:crypto.randomUUID()});return result();
 };
 const turns=new TurnCoordinator({getState:()=>state.editor.engine,interpret,preferLocal:localCommandPreference.read,
  runProject:action=>projectRunner?projectRunner(action):{outcome:"error",message:"Project controls are unavailable."},
  apply:applyCommand,
  choose:candidateId=>{dispatch({type:"choose",candidateId,idSeed:crypto.randomUUID()});return result();},
  present:presentation=>{state={...state,presentation};publish();},
 });
 // The connection layer reports through the same channel as turns, so one status line covers both.
 const present=(value:Presentation)=>{state={...state,presentation:value};publish();};
 const setProjectRunner=(runner:typeof projectRunner)=>{projectRunner=runner;};
 return {turns,dispatch,importProject,openEditor,playbackDispatch,auditDispatch,present,setProjectRunner,getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};}};
}
