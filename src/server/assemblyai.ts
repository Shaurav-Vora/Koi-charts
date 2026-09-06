import "server-only";
import { z } from "zod";
import { ApiError } from "./errors";
import { ProviderHttp, type ProviderState } from "./provider-http";

// AssemblyAI now handles speech authentication only. Interpretation uses Google directly.
export class AssemblyProvider {
 private http: ProviderHttp;
 constructor(key: string, transport?: typeof fetch, state?: ProviderState) {
  this.http = new ProviderHttp("AssemblyAI", { authorization: key }, transport, state);
 }
 async token(signal?: AbortSignal) {
  const started = Date.now();
  const response = await this.http.request("https://streaming.assemblyai.com/v3/token?expires_in_seconds=60&max_session_duration_seconds=1800", { method: "GET" }, signal);
  const parsed = z.object({ token: z.string().min(1).max(10000), expires_in_seconds: z.number().min(1).max(60).optional() }).safeParse(response);
  if (!parsed.success) throw new ApiError("UPSTREAM", "AssemblyAI returned an invalid token response.");
  return { token: parsed.data.token, expiresAt: new Date(started + (parsed.data.expires_in_seconds ?? 60) * 1000).toISOString() };
 }
}
