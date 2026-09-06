import { ApiError } from "./errors";
export class RateLimiter {
 private entries=new Map<string,{count:number;until:number}>();
 check(kind:"token"|"interpret",client:string,now=Date.now()){
  for(const [key,item] of this.entries)if(item.until<=now)this.entries.delete(key);
  const caps=kind==="token"?[6,30]:[30,120];const keys=[`client:${kind}:${client}`,`global:${kind}`];
  if(keys.some((key,i)=>(this.entries.get(key)?.count??0)>=caps[i]))throw new ApiError("RATE_LIMITED","Too many requests. Try again in one minute.");
  keys.forEach(key=>{const item=this.entries.get(key);this.entries.set(key,{count:(item?.count??0)+1,until:item?.until??now+60000});});
 }
}
export async function readJson(body:ReadableStream<Uint8Array>|null,maxBytes=65536):Promise<unknown>{
 if(!body)throw new ApiError("INVALID_INPUT","A JSON body is required.");
 const reader=body.getReader();let size=0,text="";const decoder=new TextDecoder();
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){void reader.cancel();throw new ApiError("INVALID_INPUT","Request body is too large.");}text+=decoder.decode(value,{stream:true});}return JSON.parse(text+decoder.decode());}
 catch(error){if(error instanceof ApiError)throw error;throw new ApiError("INVALID_INPUT","Invalid JSON body.");}finally{reader.releaseLock();}
}
export function checkOrigin(request:Request){
 const origin=request.headers.get("origin");
 if((origin&&origin!==new URL(request.url).origin)||request.headers.get("sec-fetch-site")==="cross-site")throw new ApiError("INVALID_INPUT","Cross-origin requests are not allowed.");
 if(request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json")throw new ApiError("INVALID_INPUT","Use application/json.");
}
