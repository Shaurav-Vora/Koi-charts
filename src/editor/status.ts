export const statusLabels = {
 idle: "Idle", connecting: "Connecting", listening: "Listening", speech_detected: "Speech detected",
 previewing: "Preview—not yet applied", interpreting: "Applying command", committed: "Change applied",
 needs_clarification: "Clarification needed", confirming_delete: "Confirmation needed", error: "Command not applied",
 voice_unavailable: "Voice editing unavailable—connection lost",
} as const;
export type VoiceStatus = keyof typeof statusLabels;
