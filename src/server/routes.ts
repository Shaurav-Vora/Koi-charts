import "server-only";
import { AssemblyProvider, type ProviderCapabilities } from "./assemblyai";
import { ApiError, errorResponse, json } from "./errors";
import { RateLimiter, checkOrigin, readJson } from "./limits";
import { parseInput } from "./input";
export function createRoutes(options:{transport?:typeof fetch;env?:()=>Record<string,string|undefined>;limiter?:RateLimiter}={}){
 const limiter=options.limiter??new RateLimiter();
 // A provider is built per request, so discovered capabilities are held here instead.
 const capabilities:ProviderCapabilities={};
 async function handle(kind:"token"|"interpret",request:Request){
  const requestId=crypto.randomUUID(),env=options.env?.()??process.env,model=env.ASSEMBLYAI_LLM_MODEL||"qwen3.5-4b-32k-fast";
  try{
   checkOrigin(request);
   // Forwarded headers are ignored unless a trusted deployment proxy is explicitly configured.
   const client=env.TRUST_PROXY==="1"?(request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0,100)||"local"):"local";
   limiter.check(kind,client);
   const body=await readJson(request.body);
   const input=kind==="interpret"?parseInput(body):null;
   if(kind==="token"&&(!body||Array.isArray(body)||typeof body!=="object"||Object.keys(body).length))throw new ApiError("INVALID_INPUT","Token requests must contain an empty JSON object.");
   if(!env.ASSEMBLYAI_API_KEY?.trim())throw new ApiError("CONFIGURATION","Set ASSEMBLYAI_API_KEY on the server to enable voice editing.");
   const provider=new AssemblyProvider(env.ASSEMBLYAI_API_KEY,model,options.transport,capabilities);
   return json(input?await provider.interpret(input,request.signal):await provider.token(request.signal));
  }catch(error){const code=error instanceof ApiError?error.code:"UPSTREAM";console.warn(JSON.stringify({requestId,code,model}));return errorResponse(error,requestId);}
 }
 return {token:(request:Request)=>handle("token",request),interpret:(request:Request)=>handle("interpret",request)};
}
export const routes=createRoutes();
