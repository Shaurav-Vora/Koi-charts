export type Speaker = { supported: boolean; speak: (text: string) => void; cancel: () => void };

const listeners = new Set<() => void>();
/**
 * Kept outside React so the server and the browser can disagree without a hydration mismatch:
 * speaking is on unless the author has turned it off, and the server cannot know that yet.
 */
export const speechPreference = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  read: () => localStorage.getItem("koi-speech") !== "off",
  readOnServer: () => true,
  write(on: boolean) { localStorage.setItem("koi-speech", on ? "on" : "off"); listeners.forEach(listener => listener()); },
};

type UtteranceConstructor = new (text: string) => SpeechSynthesisUtterance;

/**
 * The spoken half of the editor. Every reply the chart makes — where the cursor landed, which
 * ways lead onward, why an edit was refused — reaches the author through here, because a live
 * region only helps someone already running a screen reader.
 */
export function createSpeaker(
  synth: SpeechSynthesis | undefined = typeof window === "undefined" ? undefined : window.speechSynthesis,
  Utterance: UtteranceConstructor | undefined = typeof window === "undefined" ? undefined : window.SpeechSynthesisUtterance,
): Speaker {
  if (!synth || !Utterance) return { supported: false, speak: () => {}, cancel: () => {} };

  // Chrome's higher-quality voices are localService: false, meaning every utterance is sent to
  // Google to be synthesized. A chart is the author's private work, so an on-device voice wins
  // even when it sounds worse; a remote one is taken only when the machine offers nothing else.
  const pick = () => {
    const voices = synth.getVoices();
    return voices.find(voice => voice.localService && voice.default) ?? voices.find(voice => voice.localService) ?? null;
  };

  return {
    supported: true,
    speak(text) {
      if (!text.trim()) return;
      // Each reply replaces the last rather than queueing behind it. Stepping outruns speech,
      // and a queued position report would describe a node the cursor has already left.
      synth.cancel();
      const utterance = new Utterance(text);
      const voice = pick();
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    },
    cancel: () => synth.cancel(),
  };
}
