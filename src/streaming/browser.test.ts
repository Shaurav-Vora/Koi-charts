import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { assemblyKeyPreference } from "../editor/api-keys";
import { fetchStreamingToken } from "./browser";

beforeEach(() => sessionStorage.clear());
afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

it("uses a configured AssemblyAI key only to request a temporary token", async () => {
  assemblyKeyPreference.write("user-assembly-key-1234567890");
  const fetcher = vi.fn().mockResolvedValue(Response.json({ token: "temporary", expiresAt: "2026-09-20T00:00:00.000Z" }));
  vi.stubGlobal("fetch", fetcher);

  await expect(fetchStreamingToken()).resolves.toEqual({
    token: "temporary",
    expiresAt: "2026-09-20T00:00:00.000Z",
  });
  const [url, init] = fetcher.mock.calls[0];
  expect(url).toBe("/api/assemblyai/token");
  expect(new Headers(init.headers).get("x-koi-assemblyai-key")).toBe("user-assembly-key-1234567890");
});
