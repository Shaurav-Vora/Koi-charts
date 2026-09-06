export type ErrorCode="CONFIGURATION"|"INVALID_INPUT"|"RATE_LIMITED"|"UPSTREAM"|"TIMEOUT";
// `detail` carries the provider's own reason for internal decisions only.
// errorResponse sends only code and message, so it never reaches the browser.
export class ApiError extends Error {constructor(public code:ErrorCode,message:string,public detail="",public retryAfterSeconds?:number){super(message);}}
const codes={CONFIGURATION:503,INVALID_INPUT:400,RATE_LIMITED:429,UPSTREAM:502,TIMEOUT:504};
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export function errorResponse(error:unknown,requestId:string){
 const safe=error instanceof ApiError?error:new ApiError("UPSTREAM","The service could not complete the request.");
 const retryAfterSeconds=safe.code==="RATE_LIMITED"?(safe.retryAfterSeconds??60):undefined;
 const response=json({error:{code:safe.code,message:safe.message,requestId,...(retryAfterSeconds!==undefined?{retryAfterSeconds}:{})}},codes[safe.code]);
 if(retryAfterSeconds!==undefined)response.headers.set("Retry-After",String(retryAfterSeconds));
 return response;
}
