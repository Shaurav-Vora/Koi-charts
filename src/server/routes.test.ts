// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { createRoutes } from "./routes";
import { RateLimiter } from "./limits";
import { createEmptyGraph } from "../graph/invariants";
const body=()=>({transcript:"Add a start called Begin",graph:createEmptyGraph(),focusedNodeId:null,recentNodeId:null,pending:null});
const request=(value:unknown={},headers:Record<string,string>={})=>new Request("http://localhost/api/test",{method:"POST",headers:{"content-type":"application/json",...headers},body:JSON.stringify(value)});
const command={kind:"add_node",type:"start",label:"Begin",placement:null};
const completion=(content=JSON.stringify({command}),finishReason="STOP")=>Response.json({candidates:[{content:{parts:[{text:content}]},finishReason}]});
function setup(response:()=>Promise<Response>=async()=>completion(),key="test-server-secret") {const transport=vi.fn(response);const routes=createRoutes({transport:transport as typeof fetch,env:()=>({ASSEMBLYAI_API_KEY:key,GEMINI_API_KEY:key})});return {routes,transport};}
beforeEach(()=>vi.spyOn(console,"warn").mockImplementation(()=>{}));
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
describe("server routes",()=>{
 it("omits coordinates from a pending manual move",async()=>{const h=setup();const input=body();input.graph.nodes.push({id:"a",type:"process",label:"A",position:{x:30,y:40}});const pending={kind:"clarification",command:{kind:"move_to",node:{kind:"label",value:"A"},position:{x:91,y:92}},referencePath:"node",candidates:["a"],graphVersion:0,elementKind:"node",allocatedIds:[],context:{focusedNodeId:null,recentNodeId:null}};expect((await h.routes.interpret(request({...input,pending}))).status).toBe(200);const [,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];expect(JSON.parse(init.body as string).contents[0].parts[0].text).not.toContain('"position"');});
 it("keeps a client named global separate from the global bucket",()=>{const limiter=new RateLimiter();for(let i=0;i<6;i++)expect(()=>limiter.check("token","global",0)).not.toThrow();expect(()=>limiter.check("token","global",0)).toThrow();expect(()=>limiter.check("token","another",0)).not.toThrow();});
 it.each(["token","interpret"] as const)("returns safe configuration errors for %s without a key",async kind=>{const h=setup(undefined,"");const result=await h.routes[kind](request(kind==="token"?{}:body()));expect(result.status).toBe(503);expect(result.headers.get("cache-control")).toBe("no-store");expect((await result.json()).error.code).toBe("CONFIGURATION");expect(h.transport).not.toHaveBeenCalled();});
 it("uses a browser AssemblyAI key before the deployment fallback",async()=>{
  const h=setup(async()=>Response.json({token:"temporary",expires_in_seconds:60}));
  const response=await h.routes.token(request({},{"x-koi-assemblyai-key":"user-assembly-key-1234567890"}));
  expect(response.status).toBe(200);
  const [,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];
  expect(new Headers(init.headers).get("authorization")).toBe("user-assembly-key-1234567890");
  expect(JSON.stringify(init)).not.toContain("test-server-secret");
 });
 it("accepts a browser AssemblyAI key without a deployment key",async()=>{
  const transport=vi.fn(async()=>Response.json({token:"temporary",expires_in_seconds:60}));
  const routes=createRoutes({transport:transport as typeof fetch,env:()=>({})});
  expect((await routes.token(request({},{"x-koi-assemblyai-key":"user-assembly-key-1234567890"}))).status).toBe(200);
 });
 it("rejects an invalid browser AssemblyAI key before contacting the provider",async()=>{
  const h=setup();
  expect((await h.routes.token(request({},{"x-koi-assemblyai-key":"short"}))).status).toBe(400);
  expect(h.transport).not.toHaveBeenCalled();
 });
 it("keeps AssemblyAI cooldowns separate for different browser keys",async()=>{
  const transport=vi.fn()
   .mockResolvedValueOnce(new Response("rate limit",{status:429,headers:{"retry-after":"60"}}))
   .mockResolvedValueOnce(Response.json({token:"temporary",expires_in_seconds:60}));
  const routes=createRoutes({transport:transport as typeof fetch,env:()=>({})});
  const first=await routes.token(request({},{"x-koi-assemblyai-key":"first-assembly-key-1234567890"}));
  const second=await routes.token(request({},{"x-koi-assemblyai-key":"second-assembly-key-1234567890"}));
  expect(first.status).toBe(429);
  expect(second.status).toBe(200);
  expect(transport).toHaveBeenCalledTimes(2);
 });
 it("mints a short-lived token with the session cap in query parameters",async()=>{const h=setup(async()=>Response.json({token:"temporary",expires_in_seconds:60}));const response=await h.routes.token(request());expect(response.status).toBe(200);expect(await response.json()).toMatchObject({token:"temporary",expiresAt:expect.any(String)});const [url,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];expect(url).toContain("expires_in_seconds=60&max_session_duration_seconds=1800");expect(init.method).toBe("GET");});
 it("uses a valid browser Gemini key before the deployment fallback",async()=>{
  const h=setup();
  const response=await h.routes.interpret(request(body(),{"x-koi-gemini-key":"user-browser-key-1234567890"}));
  expect(response.status).toBe(200);
  const [,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];
  const headers=new Headers(init.headers);
  expect(headers.get("x-goog-api-key")).toBe("user-browser-key-1234567890");
  expect(JSON.stringify(init)).not.toContain("test-server-secret");
 });
 it("accepts a browser Gemini key when no deployment key exists",async()=>{
  const transport=vi.fn(async()=>completion());
  const routes=createRoutes({transport:transport as typeof fetch,env:()=>({})});
  expect((await routes.interpret(request(body(),{"x-koi-gemini-key":"user-browser-key-1234567890"}))).status).toBe(200);
 });
 it.each(["short","contains spaces","x".repeat(257)])("rejects invalid browser Gemini key %s",async key=>{
  const h=setup();
  expect((await h.routes.interpret(request(body(),{"x-koi-gemini-key":key}))).status).toBe(400);
  expect(h.transport).not.toHaveBeenCalled();
 });
 it("keeps Gemini cooldowns separate for different browser keys",async()=>{
  const transport=vi.fn()
   .mockResolvedValueOnce(new Response("rate limit",{status:429,headers:{"retry-after":"60"}}))
   .mockResolvedValueOnce(completion());
  const routes=createRoutes({transport:transport as typeof fetch,env:()=>({})});
  const first=await routes.interpret(request(body(),{"x-koi-gemini-key":"first-browser-key-1234567890"}));
  const second=await routes.interpret(request(body(),{"x-koi-gemini-key":"second-browser-key-1234567890"}));
  expect(first.status).toBe(429);
  expect(second.status).toBe(200);
  expect(transport).toHaveBeenCalledTimes(2);
 });
 it("uses Google's JSON schema and token cap while omitting layout coordinates",async()=>{const h=setup();const input=body();input.graph.nodes.push({id:"a",type:"start",label:"A",position:{x:20,y:30}});const response=await h.routes.interpret(request(input));expect(await response.json()).toEqual({command});const [,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];const sent=JSON.parse(init.body as string);expect(sent.generationConfig.maxOutputTokens).toBe(1024);expect(sent.generationConfig.responseJsonSchema.additionalProperties).toBe(false);expect(sent.generationConfig.responseJsonSchema.properties.command.anyOf[0].properties.kind.enum).toEqual(["label_edge"]);expect(sent.contents[0].parts[0].text).not.toContain('"position"');});
 // Google rejects the entire request with an unexplained 400 when maxItems appears anywhere,
 // so it is translated away while every other constraint stays on the wire.
 it("sends no maxItems to Google but keeps the remaining constraints",async()=>{
  const h=setup();await h.routes.interpret(request(body()));
  const [,init]=h.transport.mock.calls[0] as unknown as [string,RequestInit];
  const schema=JSON.stringify(JSON.parse(init.body as string).generationConfig.responseJsonSchema);
  expect(schema).not.toContain("maxItems");
  for(const keyword of ["minItems","minLength","maxLength","minimum","maximum"])expect(schema).toContain(keyword);
 });
 it.each([["origin","https://attacker.example"],["content-type","text/plain"],["sec-fetch-site","cross-site"]])("rejects unsafe request header %s",async (name,value)=>{const h=setup();expect((await h.routes.token(request({},{[name]:value}))).status).toBe(400);expect(h.transport).not.toHaveBeenCalled();});
 // The dev server normalizes request.url to localhost even when bound to 127.0.0.1,
 // so a same-origin browser request must be judged by the Host header instead.
 it.each(["http://127.0.0.1:3000","http://localhost:3000"])("accepts a same-origin request from %s",async origin=>{
  const h=setup(async()=>Response.json({token:"temporary",expires_in_seconds:60}));
  const host=new URL(origin).host;
  const response=await h.routes.token(new Request(`${origin}/api/assemblyai/token`,{method:"POST",headers:{"content-type":"application/json",origin,host,"sec-fetch-site":"same-origin"},body:"{}"}));
  expect(response.status).toBe(200);
 });
 it("rejects an origin whose host differs from the requested host",async()=>{
  const h=setup();
  const response=await h.routes.token(new Request("http://127.0.0.1:3000/api/assemblyai/token",{method:"POST",headers:{"content-type":"application/json",origin:"http://evil.example:3000",host:"127.0.0.1:3000"},body:"{}"}));
  expect(response.status).toBe(400);
  expect(h.transport).not.toHaveBeenCalled();
 });
 it("never falls back to AssemblyAI Gateway when Google rejects a request",async()=>{
  const h=setup(async()=>Response.json({error:{message:"Invalid schema"}},{status:400}));
  expect((await h.routes.interpret(request(body()))).status).toBe(502);expect(h.transport).toHaveBeenCalledTimes(1);
  const [url]=h.transport.mock.calls[0] as unknown as [string,RequestInit];expect(url).toContain("generativelanguage.googleapis.com");
 });
 it("does not retry when the provider fails for any other reason",async()=>{
  const h=setup(async()=>Response.json({metadata:{errors:["insufficient credits"]}},{status:400}));
  expect((await h.routes.interpret(request(body()))).status).toBe(502);
  expect(h.transport).toHaveBeenCalledTimes(1);
 });
 // Choosing a fork the speaker never named would decide a path for someone who cannot see it.
 it("drops a branch that the transcript never mentions",async()=>{
  const h=setup(async()=>completion(JSON.stringify({command:{kind:"walk",direction:"next",branch:"yes"}})));
  const response=await h.routes.interpret(request({...body(),transcript:"what comes after this one"}));
  expect(await response.json()).toEqual({command:{kind:"walk",direction:"next",branch:null}});
 });
 it("keeps a branch the speaker did name",async()=>{
  const h=setup(async()=>completion(JSON.stringify({command:{kind:"walk",direction:"next",branch:"yes"}})));
  const response=await h.routes.interpret(request({...body(),transcript:"take the Yes branch"}));
  expect(await response.json()).toEqual({command:{kind:"walk",direction:"next",branch:"yes"}});
 });
 it("accepts a command wrapped in a code fence",async()=>{
  const h=setup(async()=>completion("```json\n"+JSON.stringify({command})+"\n```"));
  expect(await(await h.routes.interpret(request(body()))).json()).toEqual({command});
 });
 it("rejects oversized streamed bodies without a content-length header",async()=>{const h=setup();const response=await h.routes.interpret(request({payload:"a".repeat(70000)}));expect(response.status).toBe(400);expect(h.transport).not.toHaveBeenCalled();});
 it("rejects oversized graph context and invalid references",async()=>{const h=setup();const input=body();input.graph.nodes=Array.from({length:101},(_,i)=>({id:String(i),type:"process",label:"Node"}));expect((await h.routes.interpret(request(input))).status).toBe(400);expect((await h.routes.interpret(request({...body(),focusedNodeId:"missing"}))).status).toBe(400);});
 it("rejects invalid pending state before reaching a provider",async()=>{const h=setup();expect((await h.routes.interpret(request({...body(),pending:{kind:"deletion"}}))).status).toBe(400);expect(h.transport).not.toHaveBeenCalled();});
 it.each(["{broken",JSON.stringify({command:{kind:"erase"}})])("rejects malformed or schema-invalid output",async content=>{const h=setup(async()=>completion(content));expect((await h.routes.interpret(request(body()))).status).toBe(502);});
 it("rejects truncated output even when its JSON is valid",async()=>{const h=setup(async()=>completion(undefined,"length"));expect((await h.routes.interpret(request(body()))).status).toBe(502);});
 it("redacts upstream errors from both response and logs",async()=>{const h=setup(async()=>new Response("test-server-secret transcript private",{status:401}));const response=await h.routes.interpret(request(body()));expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain("test-server-secret");expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private");});
 it("aborts provider requests at 15 seconds",async()=>{vi.useFakeTimers();const transport=vi.fn((_url:unknown,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener("abort",()=>reject(new Error("Aborted")))));const routes=createRoutes({transport:transport as typeof fetch,env:()=>({GEMINI_API_KEY:"test"})});const pending=routes.interpret(request(body()));await vi.advanceTimersByTimeAsync(15001);expect((await pending).status).toBe(504);});
 it("limits token requests to six per client per minute",async()=>{const h=setup(async()=>Response.json({token:"temporary"}));for(let i=0;i<6;i++)expect((await h.routes.token(request())).status).toBe(200);expect((await h.routes.token(request())).status).toBe(429);});
 it("enforces independent global caps and resets expired windows",()=>{const limiter=new RateLimiter();for(let i=0;i<30;i++)limiter.check("token",String(i),0);expect(()=>limiter.check("token","next",0)).toThrow();expect(()=>limiter.check("token","next",60001)).not.toThrow();for(let i=0;i<120;i++)limiter.check("interpret",String(i),60001);expect(()=>limiter.check("interpret","more",60001)).toThrow();});
 it("rejects malformed JSON and token bodies with extra fields",async()=>{const h=setup();expect((await h.routes.token(request({unexpected:1}))).status).toBe(400);expect((await h.routes.interpret(new Request("http://localhost/api/test",{method:"POST",headers:{"content-type":"application/json"},body:"{"}))).status).toBe(400);});
});
