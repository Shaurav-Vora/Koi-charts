import type { VoiceStatus } from "./status";

export function voiceIndicator(connection: VoiceStatus, paused: boolean, command?: VoiceStatus) {
 if (connection === "voice_unavailable") return { tone: "error", label: "Connection lost", hint: "Start voice to reconnect. Your chart is still available." };
 if (connection === "connecting") return { tone: "busy", label: "Connecting", hint: "Getting your microphone ready…" };
 if (connection !== "listening") return { tone: "off", label: "Microphone off", hint: "Start voice, then say what you want to build." };
 if (paused) return { tone: "paused", label: "Microphone paused", hint: "Wait for the spoken reply to finish, or mute replies." };
 if (command === "interpreting") return { tone: "busy", label: "Processing command", hint: "Turning your words into a chart edit." };
 if (command === "speech_detected" || command === "previewing") return { tone: "listening", label: "Hearing you", hint: "Finish your instruction, then pause." };
 return { tone: "listening", label: "Listening", hint: "Ready for your next instruction." };
}
