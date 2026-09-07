import { createPreference } from "./preference";

export type Speaker = {
  supported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
  interrupt: () => void;
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => boolean;
  dispose: () => void;
};

/** Speaking is on unless the author has turned it off: nothing else reads a reply aloud. */
export const speechPreference = createPreference("koi-speech", true);

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
  const subscribers = new Set<() => void>();
  let blocked = false;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const setBlocked = (value: boolean) => {
    if (blocked === value) return;
    blocked = value;
    subscribers.forEach(listener => listener());
  };
  const store = {
    subscribe(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
    getSnapshot: () => blocked,
  };
  if (!synth || !Utterance) return { ...store, supported: false, speak: () => {}, cancel: () => {}, interrupt: () => {}, dispose: () => {} };
  // Keep the final audio chunk and speaker echo out of the microphone stream.
  const release = (current: number) => {
    if (current !== generation) return;
    clearTimeout(timer);
    timer = setTimeout(() => { if (current === generation) setBlocked(false); }, 400);
  };

  // Chrome's higher-quality voices are localService: false, meaning every utterance is sent to
  // Google to be synthesized. A chart is the author's private work, so an on-device voice wins
  // even when it sounds worse; a remote one is taken only when the machine offers nothing else.
  const pick = () => {
    const voices = synth.getVoices();
    return voices.find(voice => voice.localService && voice.default) ?? voices.find(voice => voice.localService) ?? null;
  };

  return {
    ...store,
    supported: true,
    speak(text) {
      if (!text.trim()) return;
      // Each reply replaces the last rather than queueing behind it. Stepping outruns speech,
      // and a queued position report would describe a node the cursor has already left.
      const current = ++generation;
      clearTimeout(timer);
      setBlocked(true);
      synth.cancel();
      const utterance = new Utterance(text);
      utterance.onend = utterance.onerror = () => release(current);
      const voice = pick();
      if (voice) utterance.voice = voice;
      try { synth.speak(utterance); } catch { release(current); }
    },
    cancel() {
      const current = ++generation;
      synth.cancel();
      if (blocked) release(current);
    },
    /**
     * Cancelling because the author has started talking. The 400 ms guard exists to keep the
     * tail of a finished reply out of the microphone; here there is no tail, and holding input
     * shut for another 400 ms would swallow the first word of what they came to say.
     */
    interrupt() {
      generation++;
      clearTimeout(timer);
      synth.cancel();
      setBlocked(false);
    },
    dispose() {
      generation++;
      clearTimeout(timer);
      synth.cancel();
      setBlocked(false);
    },
  };
}
