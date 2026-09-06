import { expect, it } from "vitest";
import { voiceIndicator } from "./voice-status";

it("keeps listening visible after a command completes or fails", () => {
 for (const command of ["committed", "error", "needs_clarification"] as const) {
  expect(voiceIndicator("listening", false, command)).toMatchObject({ tone: "listening", label: "Listening" });
 }
});
it("does not show listening when speech has paused microphone input", () => {
 expect(voiceIndicator("listening", true, "committed")).toMatchObject({ tone: "paused", label: "Microphone paused" });
 expect(voiceIndicator("idle", true)).toMatchObject({ tone: "off", label: "Microphone off" });
});
it("distinguishes connection, processing, hearing and lost-connection states", () => {
 expect(voiceIndicator("connecting", false).tone).toBe("busy");
 expect(voiceIndicator("listening", false, "interpreting").label).toBe("Processing command");
 expect(voiceIndicator("listening", false, "speech_detected").label).toBe("Hearing you");
 expect(voiceIndicator("voice_unavailable", false).tone).toBe("error");
});
