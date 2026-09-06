// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRoutes } from "./routes";
import { createEngineState, execute } from "../commands/execute";
it.each([
 ["connect it to a process node", 1, 200, 2],
 ["connect it to a NEW process node", 1, 200, 3],
 ["connect it to a process node", 2, 400, 3],
 ["connect it to a NEW process node", 2, 200, 4],
] as const)("resolves existing destinations safely: %s with %s matches", async (transcript, count, status, total) => {
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const transport=vi.fn();
 const graph={schemaVersion:1 as const,nodes:[{id:"s",type:"start" as const,label:"Start"},...Array.from({length:count},(_,i)=>({id:`p${i}`,type:"process" as const,label:`Work ${i}`}))],edges:[]};
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"test"})}).interpret(new Request("http://localhost/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({transcript,graph,focusedNodeId:"s",recentNodeId:"s",pending:null})}));
 expect(response.status).toBe(status);
 const data=await response.json();
 expect(transport).not.toHaveBeenCalled();
 if(status===400) { expect(data.error.message).toContain("several process nodes"); return; }
 const before={...createEngineState(),graph,focusedNodeId:"s",recentNodeId:"s"};
 let serial=0;
 const result=execute(before,data.command,()=>`generated-${++serial}`);
 expect(result.outcome).toBe("committed");
 expect(result.state.graph.nodes).toHaveLength(total);
 expect(result.state.graph.edges).toHaveLength(1);
 expect(result.state.graph.edges[0].source).toBe("s");
 expect(result.state.graph.edges[0].target).toBe(transcript.includes("NEW")?"generated-1":"p0");
 expect(execute(result.state,{kind:"undo"},()=>"unused").state.graph).toEqual(graph);
});
it.each(["connect it to a process node", "connect it to a NEW process node"])("creates the requested destination without trusting a self-edge response: %s", async transcript => {
 const transport=vi.fn().mockResolvedValue(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({command:{kind:"connect",source:{kind:"focus"},target:{kind:"focus"},label:null}})}]}}]}));
 const graph={schemaVersion:1 as const,nodes:[{id:"start-id",type:"start" as const,label:"Start"}],edges:[]};
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"test"})}).interpret(new Request("http://localhost/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({transcript,graph,focusedNodeId:"start-id",recentNodeId:"start-id",pending:null})}));
 expect(response.status).toBe(200);
 let serial=0;
 const result=execute({...createEngineState(),graph,focusedNodeId:"start-id",recentNodeId:"start-id"},(await response.json()).command,()=>`new-${++serial}`);
 expect(result.outcome).toBe("committed");
 expect(result.state.graph.nodes.at(-1)).toMatchObject({id:"new-1",type:"process",label:"Process"});
 expect(result.state.graph.edges).toEqual([{id:"new-2",source:"start-id",target:"new-1"}]);
 expect(transport).not.toHaveBeenCalled();
});
it.each(["add-only", "compound"] as const)("anchors connect-it to the original node for %s output", async variant => {
 const add = {kind:"add_node",type:"process",label:"Process",placement:null};
 const proposed = variant === "add-only" ? add : {kind:"compound",commands:[add,{kind:"connect",source:{kind:"focus"},target:{kind:"recent"},label:null}]};
 const transport=vi.fn().mockResolvedValue(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({command:proposed})}]}}]}));
 const graph={schemaVersion:1 as const,nodes:[{id:"original-start",type:"start" as const,label:"Start"}],edges:[]};
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"test"})}).interpret(new Request("http://localhost/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({transcript:"connect it to a process node",graph,focusedNodeId:"original-start",recentNodeId:"original-start",pending:null})}));
 expect(response.status).toBe(200);
 let serial=0;
 const result=execute({...createEngineState(),graph,focusedNodeId:"original-start",recentNodeId:"original-start"},(await response.json()).command,()=>`generated-${++serial}`);
 expect(result.outcome).toBe("committed");
 expect(result.state.graph.nodes).toHaveLength(2);
 expect(result.state.graph.edges).toEqual([{id:"generated-2",source:"original-start",target:"generated-1"}]);
});
const command={kind:"add_node",type:"start",label:"Begin",placement:null};
it.each([
 ["connect it to Process", "original-start", 200, "original-start"],
 ["connect Start to Process", "process-node", 200, "original-start"],
 ["connect it to Process", null, 400, null],
] as const)("handles selection safely for %s with focus %s", async (transcript, focus, status, source) => {
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const proposed={kind:"connect",source:{kind:"id",value:"original-start"},target:{kind:"id",value:"process-node"},label:null};
 const transport=vi.fn().mockResolvedValue(Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({command:proposed})}]}}]}));
 const graph={schemaVersion:1,nodes:[{id:"original-start",type:"start",label:"Start"},{id:"process-node",type:"process",label:"Process"}],edges:[]};
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"test"})}).interpret(new Request("http://localhost/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({transcript,graph,focusedNodeId:focus,recentNodeId:"process-node",pending:null})}));
 expect(response.status).toBe(status);
 const result=await response.json();
 if (source) expect(result.command).toEqual({...proposed,source:{kind:"id",value:source}});
 else expect(result.error.message).toContain("Select the node");
});
const completion=(overrides={})=>Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({command})}]}}],...overrides});
const request=()=>new Request("http://localhost/api/commands/interpret",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({transcript:"Add a start called Begin",graph:{schemaVersion:1,nodes:[],edges:[]},focusedNodeId:null,recentNodeId:null,pending:null})});
afterEach(()=>vi.restoreAllMocks());
it("calls Google directly with only the Google key and the configured model",async()=>{
 const transport=vi.fn().mockResolvedValue(completion());
 const routes=createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret",GEMINI_MODEL:"gemini-3.1-flash-lite",ASSEMBLYAI_API_KEY:"assembly-secret"})});
 const response=await routes.interpret(request());expect(response.status).toBe(200);expect(await response.json()).toEqual({command});
 const [url,init]=transport.mock.calls[0];expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent");
 expect(init.headers["x-goog-api-key"]).toBe("google-secret");expect(init.headers.authorization).toBeUndefined();
 expect(JSON.stringify([url,init.body])).not.toContain("google-secret");expect(JSON.stringify([url,init])).not.toContain("assembly-secret");
 const body=JSON.parse(init.body);expect(body.generationConfig.maxOutputTokens).toBe(1024);
 expect(body.generationConfig.responseMimeType).toBe("application/json");expect(body.generationConfig.responseJsonSchema).toHaveProperty("properties.command.anyOf");
 expect(body.contents[0].parts[0].text).toContain("Add a start called Begin");expect(transport).toHaveBeenCalledTimes(1);
});
it("requires a Google key even if an AssemblyAI key is present",async()=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});const transport=vi.fn();
 const response=await createRoutes({transport,env:()=>({ASSEMBLYAI_API_KEY:"assembly-secret"})}).interpret(request());
 expect(response.status).toBe(503);expect((await response.json()).error.message).toContain("GEMINI_API_KEY");expect(transport).not.toHaveBeenCalled();
});
it("does not require the AssemblyAI key for command interpretation",async()=>{
 const response=await createRoutes({transport:vi.fn().mockResolvedValue(completion()),env:()=>({GEMINI_API_KEY:"google-secret"})}).interpret(request());expect(response.status).toBe(200);
});
it.each(["MAX_TOKENS","SAFETY","RECITATION"])("rejects Gemini finish reason %s even with valid-looking JSON",async finishReason=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const transport=vi.fn().mockResolvedValue(completion({candidates:[{finishReason,content:{parts:[{text:JSON.stringify({command})}]}}]}));
 expect((await createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret"})}).interpret(request())).status).toBe(502);
});
it("rejects prompt blocking and never exposes provider details",async()=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const transport=vi.fn().mockResolvedValue(completion({promptFeedback:{blockReason:"SAFETY",blockReasonMessage:"private input"}}));
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret"})}).interpret(request());
 expect(response.status).toBe(502);expect(JSON.stringify(await response.json())).not.toContain("private input");
});
it("ignores thought text and joins split answer parts",async()=>{
 const answer=JSON.stringify({command});const transport=vi.fn().mockResolvedValue(completion({candidates:[{finishReason:"STOP",content:{parts:[{thought:true,text:"private reasoning"},{text:answer.slice(0,10)},{text:answer.slice(10)}]}}]}));
 expect(await(await createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret"})}).interpret(request())).json()).toEqual({command});
});
it("keeps the AssemblyAI speech-token endpoint and its credentials separate",async()=>{
 const transport=vi.fn().mockResolvedValue(Response.json({token:"temporary",expires_in_seconds:60}));
 const response=await createRoutes({transport,env:()=>({ASSEMBLYAI_API_KEY:"assembly-secret"})}).token(new Request("http://localhost/api/assemblyai/token",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}));
 expect(response.status).toBe(200);const [url,init]=transport.mock.calls[0];expect(url).toContain("streaming.assemblyai.com/v3/token");expect(init.headers.authorization).toBe("assembly-secret");expect(init.headers["x-goog-api-key"]).toBeUndefined();
});
it("honors Google's RetryInfo without sending commands through Gateway",async()=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const transport=vi.fn().mockResolvedValue(Response.json({error:{code:429,status:"RESOURCE_EXHAUSTED",details:[{"@type":"type.googleapis.com/google.rpc.RetryInfo",retryDelay:"9.2s"}]}},{status:429}));
 const routes=createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret"})});
 const response=await routes.interpret(request());expect(response.status).toBe(429);expect(response.headers.get("Retry-After")).toBe("10");
 expect((await response.json()).error.message).toContain("Google Gemini");
 await routes.interpret(request());expect(transport).toHaveBeenCalledTimes(1);
});
it("does not let a Google cooldown block AssemblyAI speech authentication",async()=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});
 const transport=vi.fn().mockResolvedValueOnce(new Response("rate limit",{status:429})).mockResolvedValueOnce(Response.json({token:"temporary"}));
 const routes=createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret",ASSEMBLYAI_API_KEY:"assembly-secret"})});
 expect((await routes.interpret(request())).status).toBe(429);
 expect((await routes.token(new Request("http://localhost/api/assemblyai/token",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}))).status).toBe(200);
});
it("rejects a model URL before transmitting the key",async()=>{
 vi.spyOn(console,"warn").mockImplementation(()=>{});const transport=vi.fn();
 const response=await createRoutes({transport,env:()=>({GEMINI_API_KEY:"google-secret",GEMINI_MODEL:"https://example.com"})}).interpret(request());
 expect(response.status).toBe(503);expect(transport).not.toHaveBeenCalled();
});
