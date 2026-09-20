import "server-only";
import { AssemblyProvider } from "./assemblyai";
import { GeminiProvider, DEFAULT_GEMINI_MODEL } from "./gemini";
import { createProviderState } from "./provider-http";
import { ApiError, errorResponse, json } from "./errors";
import { RateLimiter, checkOrigin, readJson } from "./limits";
import { parseInput } from "./input";
function browserProviderKey(request:Request,headerName:string,provider:"Gemini"|"AssemblyAI"){
 const header=request.headers.get(headerName);
 if(header===null)return null;
 const key=header.trim();
 if(!/^[A-Za-z0-9._-]{20,256}$/.test(key))throw new ApiError("INVALID_INPUT","Enter a valid "+provider+" API key.");
 return key;
}
export function createRoutes(options:{transport?:typeof fetch;env?:()=>Record<string,string|undefined>;limiter?:RateLimiter}={}){
 const limiter=options.limiter??new RateLimiter();
 // Shared per process and isolated by provider URL/model plus a non-reversible credential scope.
 const providerState=createProviderState();
 async function handle(kind:"token"|"interpret",request:Request){
  const requestId=crypto.randomUUID(),env=options.env?.()??process.env,model=kind==="interpret"?(env.GEMINI_MODEL?.trim()||DEFAULT_GEMINI_MODEL):"streaming";
  try{
   checkOrigin(request);
   // Forwarded headers are ignored unless a trusted deployment proxy is explicitly configured.
   const client=env.TRUST_PROXY==="1"?(request.headers.get("x-forwarded-for")?.split(",")[0].trim().slice(0,100)||"local"):"local";
   limiter.check(kind,client);
   const body=await readJson(request.body);
   const input=kind==="interpret"?parseInput(body):null;
   if(kind==="token"&&(!body||Array.isArray(body)||typeof body!=="object"||Object.keys(body).length))throw new ApiError("INVALID_INPUT","Token requests must contain an empty JSON object.");
   if(input){
    const apiKey=browserProviderKey(request,"x-koi-gemini-key","Gemini")??env.GEMINI_API_KEY?.trim();
    if(!apiKey)throw new ApiError("CONFIGURATION","Add a Gemini key in the workspace, or set GEMINI_API_KEY on the server.");
    return json(await new GeminiProvider(apiKey,model,options.transport,providerState).interpret(input,request.signal));
   }
   const apiKey=browserProviderKey(request,"x-koi-assemblyai-key","AssemblyAI")??env.ASSEMBLYAI_API_KEY?.trim();
   if(!apiKey)throw new ApiError("CONFIGURATION","Add an AssemblyAI key in the workspace, or set ASSEMBLYAI_API_KEY on the server.");
   return json(await new AssemblyProvider(apiKey,options.transport,providerState).token(request.signal));
  }catch(error){const code=error instanceof ApiError?error.code:"UPSTREAM";console.warn(JSON.stringify({requestId,code,model}));return errorResponse(error,requestId);}
 }
 return {token:(request:Request)=>handle("token",request),interpret:(request:Request)=>handle("interpret",request)};
}
export const routes=createRoutes();
