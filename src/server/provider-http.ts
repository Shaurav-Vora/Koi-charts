import "server-only";
import { ApiError } from "./errors";
import { readJson } from "./limits";

export type ProviderState = { cooldowns: Map<string, number> };
export const createProviderState = (): ProviderState => ({ cooldowns: new Map() });

function retryDelay(header: string | null, detail: string): number {
 if (header && /^\d+(?:\.\d+)?$/.test(header.trim())) {
  const value = Math.ceil(Number(header));
  if (Number.isSafeInteger(value) && value > 0) return value;
 }
 if (header && /^[A-Za-z]{3},/.test(header)) {
  const value = Math.ceil((Date.parse(header) - Date.now()) / 1000);
  if (Number.isSafeInteger(value) && value > 0) return value;
 }
 // Gemini may return google.rpc.RetryInfo instead of an HTTP Retry-After header.
 try {
  const data = JSON.parse(detail);
  for (const item of Array.isArray(data.error?.details) ? data.error.details : []) {
   if (item["@type"] !== "type.googleapis.com/google.rpc.RetryInfo" || typeof item.retryDelay !== "string") continue;
   if (!/^\d+(?:\.\d+)?s$/.test(item.retryDelay)) continue;
   const value = Math.ceil(Number(item.retryDelay.slice(0, -1)));
   if (Number.isSafeInteger(value) && value > 0) return value;
  }
 } catch { /* An error response need not be JSON. */ }
 return 60;
}

async function errorDetail(response: Response) {
 if (!response.body) return "";
 const reader = response.body.getReader(), decoder = new TextDecoder();
 let text = "", size = 0;
 try {
  while (size < 4096) {
   const { done, value } = await reader.read(); if (done) break;
   const bytes = value.subarray(0, 4096 - size); size += bytes.length;
   text += decoder.decode(bytes, { stream: true });
  }
  return text + decoder.decode();
 } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export class ProviderHttp {
 constructor(private name: "Google Gemini" | "AssemblyAI", private headers: Record<string, string>, private transport: typeof fetch = fetch, private state = createProviderState()) {}
 private throttled(seconds: number) {
  return new ApiError("RATE_LIMITED", `${this.name} is rate-limited. Wait ${seconds} seconds, then repeat your command. If this persists, check your provider's model limits and account quota.`, "", seconds);
 }
 async request(url: string, init: RequestInit, parent?: AbortSignal): Promise<unknown> {
  const until = this.state.cooldowns.get(url) ?? 0;
  if (until > Date.now()) throw this.throttled(Math.ceil((until - Date.now()) / 1000));
  const controller = new AbortController(), abort = () => controller.abort();
  parent?.addEventListener("abort", abort, { once: true }); if (parent?.aborted) abort();
  const timer = setTimeout(abort, 15000);
  try {
   const response = await this.transport(url, { ...init, cache: "no-store", signal: controller.signal, headers: { "content-type": "application/json", ...this.headers } });
   if (!response.ok) {
    const detail = await errorDetail(response).catch(() => "");
    // No raw provider error body, transcript, key or chart labels enter logs or responses.
    if (response.status === 429) {
     if (/insufficient.{0,30}(?:credit|balance)|billing|payment required|quota.{0,20}exhausted/i.test(detail)) throw new ApiError("CONFIGURATION", `${this.name} rejected this request because of account billing or quota. Check your provider account before trying again.`);
     const seconds = retryDelay(response.headers.get("retry-after"), detail);
     this.state.cooldowns.set(url, Date.now() + seconds * 1000);
     throw this.throttled(seconds);
    }
    if (response.status === 401 || response.status === 403) throw new ApiError("CONFIGURATION", `${this.name} rejected the server API key or account access. Check the key and API permissions.`);
    if (response.status === 404 && this.name === "Google Gemini") throw new ApiError("CONFIGURATION", "The configured Gemini model is unavailable. Check GEMINI_MODEL and your Google API access.");
    throw new ApiError("UPSTREAM", `${this.name} could not complete the request (HTTP ${response.status}).`);
   }
   return await readJson(response.body, 65536);
  } catch (error) {
   if (controller.signal.aborted) throw new ApiError("TIMEOUT", "The request timed out or was cancelled.");
   if (error instanceof ApiError && error.code !== "INVALID_INPUT") throw error;
   throw new ApiError("UPSTREAM", `${this.name} returned an invalid response.`);
  } finally { clearTimeout(timer); parent?.removeEventListener("abort", abort); }
 }
}
