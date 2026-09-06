// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { interpretOnServer } from "./interpret-client";
import { createEngineState } from "../commands/execute";
afterEach(() => vi.unstubAllGlobals());
it("shows the server's actionable rate-limit message and preserves chart state", async () => {
 const message="AssemblyAI command interpretation is rate-limited. Wait 12 seconds, then repeat your command.";
 const fetcher=vi.fn().mockResolvedValue(Response.json({error:{code:"RATE_LIMITED",message,retryAfterSeconds:12}},{status:429}));
 vi.stubGlobal("fetch",fetcher);
 const state=createEngineState(),before=structuredClone(state),signal=new AbortController().signal;
 await expect(interpretOnServer("Add a start called Begin",state,signal)).rejects.toThrow(message);
 expect(state).toEqual(before);expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0][1].signal).toBe(signal);
});
it("returns a validated command and rejects malformed success responses", async () => {
 const fetcher=vi.fn().mockResolvedValueOnce(Response.json({command:{kind:"describe",scope:"chart"}})).mockResolvedValueOnce(Response.json({command:{kind:"erase_everything"}}));
 vi.stubGlobal("fetch",fetcher);
 const state=createEngineState(),signal=new AbortController().signal;
 await expect(interpretOnServer("Describe the chart",state,signal)).resolves.toEqual({kind:"describe",scope:"chart"});
 await expect(interpretOnServer("Describe the chart",state,signal)).rejects.toThrow("invalid command");
});
it("keeps a readable fallback when an upstream proxy returns HTML", async () => {
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>",{status:502})));
 await expect(interpretOnServer("Describe the chart",createEngineState(),new AbortController().signal)).rejects.toThrow("Could not interpret the command. Please try again.");
});
