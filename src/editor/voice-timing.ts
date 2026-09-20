export const voiceTurnModes = ["min_latency", "balanced", "max_accuracy"] as const;
export type VoiceTurnMode = typeof voiceTurnModes[number];

const isVoiceTurnMode = (value: string | null): value is VoiceTurnMode =>
  voiceTurnModes.includes(value as VoiceTurnMode);

const listeners = new Set<() => void>();
const fallback: VoiceTurnMode = "balanced";

export const voiceTimingPreference = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  read(): VoiceTurnMode {
    if (typeof localStorage === "undefined") return fallback;
    const stored = localStorage.getItem("koi-voice-timing");
    return isVoiceTurnMode(stored) ? stored : fallback;
  },
  readOnServer: (): VoiceTurnMode => fallback,
  write(mode: VoiceTurnMode) {
    localStorage.setItem("koi-voice-timing", mode);
    listeners.forEach(listener => listener());
  },
};
