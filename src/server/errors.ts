export type ErrorCode="CONFIGURATION"|"INVALID_INPUT"|"RATE_LIMITED"|"UPSTREAM"|"TIMEOUT";
export class ApiError extends Error {constructor(public code:ErrorCode,message:string){super(message);}}
const codes={CONFIGURATION:503,INVALID_INPUT:400,RATE_LIMITED:429,UPSTREAM:502,TIMEOUT:504};
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}});}
export function errorResponse(error:unknown,requestId:string){const safe=error instanceof ApiError?error:new ApiError("UPSTREAM","The service could not complete the request.");return json({error:{code:safe.code,message:safe.message,requestId}},codes[safe.code]);}
