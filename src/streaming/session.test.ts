// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { StreamingSession, type SocketLike, type MicrophoneLike } from "./session";
import type { Turn } from "./turns";
import type { VoiceStatus } from "../editor/status";

class FakeSocket implements SocketLike {
 sent:(string|ArrayBuffer)[]=[];
 closed=false;
 onopen:(()=>void)|null=null;
 onmessage:((data:string)=>void)|null=null;
 onclose:(()=>void)|null=null;
 onerror:(()=>void)|null=null;
 constructor(readonly url:string){}
 send(data:string|ArrayBuffer){if(this.closed)throw new Error("send after close");this.sent.push(data);}
 close(){this.closed=true;this.onclose?.();}
 open(){this.onopen?.();}
 begin(id="session-1"){this.onmessage?.(JSON.stringify({type:"Begin",id,expires_at:0}));}
 turn(transcript:string,end_of_turn:boolean,turn_order=0){this.onmessage?.(JSON.stringify({type:"Turn",transcript,end_of_turn,turn_order}));}
 get audio(){return this.sent.filter(item=>typeof item!=="string") as ArrayBuffer[];}
 get messages(){return (this.sent.filter(item=>typeof item==="string") as string[]).map(text=>JSON.parse(text));}
}

class FakeMicrophone implements MicrophoneLike {
 private listener:((buffer:ArrayBuffer,level:number)=>void)|null=null;
 stopped=false;
 onFrame(callback:(buffer:ArrayBuffer,level:number)=>void){this.listener=callback;}
 emit(byte=1){this.listener?.(new Uint8Array([byte,0]).buffer,0.5);}
 async stop(){this.stopped=true;}
}

function harness(overrides:{token?:()=>Promise<{token:string;expiresAt:string}>;suppressed?:()=>boolean}={}) {
 const sockets:FakeSocket[]=[];const microphones:FakeMicrophone[]=[];
 const turns:Turn[]=[];const statuses:VoiceStatus[]=[];const errors:string[]=[];
 let tokenCalls=0;
 const session=new StreamingSession({
  fetchToken:overrides.token??(async()=>{tokenCalls++;return {token:`t${tokenCalls}`,expiresAt:"2026-09-06T00:00:00.000Z"};}),
  openSocket:url=>{const socket=new FakeSocket(url);sockets.push(socket);return socket;},
  openMicrophone:async()=>{const microphone=new FakeMicrophone();microphones.push(microphone);return microphone;},
  onTurn:turn=>turns.push(turn),
  onStatus:status=>statuses.push(status),
  onLevel:()=>{},
  onError:message=>errors.push(message),
  isInputSuppressed:overrides.suppressed,
 });
 return {session,sockets,microphones,turns,statuses,errors,tokenCount:()=>tokenCalls};
}

describe("streaming session",()=>{
 it("sends silence during spoken replies and resumes real microphone audio afterward",async()=>{
  let suppressed=false;const h=harness({suppressed:()=>suppressed});await h.session.start();h.sockets[0].begin();
  h.microphones[0].emit(7);suppressed=true;h.microphones[0].emit(9);suppressed=false;h.microphones[0].emit(11);
  expect(h.sockets[0].audio.map(buffer=>[...new Uint8Array(buffer)])).toEqual([[7,0],[0,0],[11,0]]);
  await h.session.stop();
 });
 it("connects with a temporary token and 16 kHz sample rate in the query string",async()=>{
  const h=harness();await h.session.start();
  const url=new URL(h.sockets[0].url);
  expect(url.origin+url.pathname).toBe("wss://streaming.assemblyai.com/v3/ws");
  expect(url.searchParams.get("token")).toBe("t1");
  expect(url.searchParams.get("sample_rate")).toBe("16000");
  expect(url.searchParams.get("speech_model")).toBe("universal-3-5-pro");
  await h.session.stop();
 });

 it("holds microphone audio until the Begin message arrives",async()=>{
  const h=harness();await h.session.start();
  const socket=h.sockets[0],microphone=h.microphones[0];
  socket.open();microphone.emit(7);
  expect(socket.audio).toHaveLength(0);
  socket.begin();microphone.emit(9);
  expect(socket.audio).toHaveLength(1);
  expect(new Uint8Array(socket.audio[0])[0]).toBe(9);
  await h.session.stop();
 });

 it("translates Turn messages into coordinator turns keyed by session and turn order",async()=>{
  const h=harness();await h.session.start();
  const socket=h.sockets[0];socket.open();socket.begin("abc");
  socket.turn("add process",false,0);socket.turn("add process node",true,0);socket.turn("connect them",false,1);
  expect(h.turns).toEqual([
   {sessionId:"abc",turnId:"0",text:"add process",final:false},
   {sessionId:"abc",turnId:"0",text:"add process node",final:true},
   {sessionId:"abc",turnId:"1",text:"connect them",final:false},
  ]);
  await h.session.stop();
 });

 it("terminates explicitly and releases the microphone on stop",async()=>{
  const h=harness();await h.session.start();
  const socket=h.sockets[0];socket.open();socket.begin();
  await h.session.stop();
  expect(socket.messages).toEqual([{type:"Terminate"}]);
  expect(socket.closed).toBe(true);
  expect(h.microphones[0].stopped).toBe(true);
  expect(h.statuses.at(-1)).toBe("idle");
 });

 it("requests a fresh token for every start",async()=>{
  const h=harness();
  await h.session.start();await h.session.stop();
  await h.session.start();
  expect(h.tokenCount()).toBe(2);
  expect(new URL(h.sockets[1].url).searchParams.get("token")).toBe("t2");
  await h.session.stop();
 });

 it("reports a denied microphone without leaving the socket open",async()=>{
  const sockets:FakeSocket[]=[];const errors:string[]=[];const statuses:VoiceStatus[]=[];
  const session=new StreamingSession({
   fetchToken:async()=>({token:"t",expiresAt:""}),
   openSocket:url=>{const socket=new FakeSocket(url);sockets.push(socket);return socket;},
   openMicrophone:async()=>{throw new DOMException("Permission denied","NotAllowedError");},
   onTurn:()=>{},onStatus:status=>statuses.push(status),onLevel:()=>{},onError:message=>errors.push(message),
  });
  await session.start();
  expect(errors[0]).toMatch(/microphone/i);
  expect(sockets[0]?.closed ?? true).toBe(true);
  expect(statuses.at(-1)).toBe("idle");
 });

 it("surfaces a lost connection as voice_unavailable and stops the microphone",async()=>{
  const h=harness();await h.session.start();
  const socket=h.sockets[0];socket.open();socket.begin();
  socket.onclose?.();
  expect(h.statuses.at(-1)).toBe("voice_unavailable");
  expect(h.microphones[0].stopped).toBe(true);
 });

 it("stops automatically at the thirty-minute session limit",async()=>{
  vi.useFakeTimers();
  try {
   const h=harness();await h.session.start();
   const socket=h.sockets[0];socket.open();socket.begin();
   await vi.advanceTimersByTimeAsync(30*60*1000);
   expect(socket.messages).toEqual([{type:"Terminate"}]);
   expect(h.microphones[0].stopped).toBe(true);
  } finally { vi.useRealTimers(); }
 });

 it("ignores turns that arrive after stop", async()=>{
  const h=harness();await h.session.start();
  const socket=h.sockets[0];socket.open();socket.begin();
  await h.session.stop();
  socket.onmessage?.(JSON.stringify({type:"Turn",transcript:"late",end_of_turn:true,turn_order:5}));
  expect(h.turns).toEqual([]);
 });
});
