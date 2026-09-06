// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createRoutes } from "./routes";
const command = { kind: "describe", scope: "chart" };
const request = () => new Request("http://localhost/api/commands/interpret", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ transcript: "Describe the chart", graph: { schemaVersion: 1, nodes: [], edges: [] }, focusedNodeId: null, recentNodeId: null, pending: null }),
});
const completion = (content: unknown) => Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify(content) } }] });
beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
describe("provider recovery", () => {
  it("preserves a provider 429 and waits out its cooldown without repeat calls", async () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const transport = vi.fn().mockResolvedValueOnce(new Response("Too many requests private-transcript", { status: 429, headers: { "Retry-After": "12" } })).mockResolvedValueOnce(completion({ command }));
    const routes = createRoutes({ transport, env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) });
    const first = await routes.interpret(request());
    expect(first.status).toBe(429); expect(first.headers.get("Retry-After")).toBe("12");
    expect(await first.json()).toMatchObject({ error: { code: "RATE_LIMITED", retryAfterSeconds: 12 } });
    vi.setSystemTime(5000);
    const again = await routes.interpret(request());
    expect(again.status).toBe(429); expect(again.headers.get("Retry-After")).toBe("7");
    expect(transport).toHaveBeenCalledTimes(1);
    vi.setSystemTime(12001);
    expect((await routes.interpret(request())).status).toBe(200);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private-transcript");
  });
  it.each([null, "invalid", "-1"])("uses a 60-second cooldown for unusable Retry-After %s", async header => {
    const response = new Response("rate limit", { status: 429, headers: header === null ? {} : { "Retry-After": header } });
    const routes = createRoutes({ transport: vi.fn().mockResolvedValue(response), env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) });
    expect((await routes.interpret(request())).headers.get("Retry-After")).toBe("60");
  });
  it("honors an HTTP-date Retry-After", async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-06T10:00:00Z"));
    const routes = createRoutes({ transport: vi.fn().mockResolvedValue(new Response("rate limit", { status: 429, headers: { "Retry-After": "Sun, 06 Sep 2026 10:00:20 GMT" } })), env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) });
    expect((await routes.interpret(request())).headers.get("Retry-After")).toBe("20");
  });
  it("distinguishes an explicit billing rejection from temporary throttling", async () => {
    const transport = vi.fn().mockResolvedValue(new Response("insufficient credits secret", { status: 429 }));
    const response = await createRoutes({ transport, env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) }).interpret(request());
    expect(response.status).toBe(503); expect(response.headers.get("Retry-After")).toBeNull();
    const body = await response.json(); expect(body.error.code).toBe("CONFIGURATION"); expect(body.error.message).toMatch(/billing|quota/i); expect(JSON.stringify(body)).not.toContain("secret");
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it("wraps a fully validated bare command after structured-output fallback", async () => {
    const transport = vi.fn().mockResolvedValueOnce(new Response("model does not support response_format", { status: 400 })).mockResolvedValueOnce(completion(command));
    const response = await createRoutes({ transport, env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) }).interpret(request());
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ command });
  });
  it.each([{ kind: "describe", scope: "wrong" }, { kind: "describe", scope: "chart", extra: true }])("still rejects invalid bare output %j", async command => {
    const transport = vi.fn().mockResolvedValueOnce(new Response("model does not support response_format", { status: 400 })).mockResolvedValueOnce(completion(command));
    expect((await createRoutes({ transport, env: () => ({ ASSEMBLYAI_API_KEY: "secret" }) }).interpret(request())).status).toBe(502);
  });
});
