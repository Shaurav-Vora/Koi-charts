// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSpeaker } from "./speech";

type Voice = { name: string; localService: boolean; default: boolean };
class FakeUtterance { voice: unknown = null; constructor(public text: string) {} }
function fakeSynth(voices: Voice[] = []) {
  const spoken: FakeUtterance[] = [];
  const cancel = vi.fn();
  const synth = { getVoices: () => voices, speak: (u: unknown) => { spoken.push(u as FakeUtterance); }, cancel };
  return { synth, spoken, cancel };
}
const make = (voices?: Voice[]) => {
  const fake = fakeSynth(voices);
  return { ...fake, speaker: createSpeaker(fake.synth as unknown as SpeechSynthesis, FakeUtterance as never) };
};

describe("speaking replies", () => {
  it("reports itself unsupported rather than throwing where there is no speech engine", () => {
    const speaker = createSpeaker(undefined, undefined);
    expect(speaker.supported).toBe(false);
    expect(() => { speaker.speak("Anything"); speaker.cancel(); }).not.toThrow();
  });
  it("speaks a reply", () => {
    const h = make();
    h.speaker.speak(`"Begin" (start). 1 way onward.`);
    expect(h.spoken.map(u => u.text)).toEqual([`"Begin" (start). 1 way onward.`]);
  });
  // Status changes present an empty string; announcing silence would cut off the reply in progress.
  it.each(["", "   "])("ignores an empty reply without cancelling what is being said: %j", text => {
    const h = make();
    h.speaker.speak(text);
    expect(h.spoken).toHaveLength(0);
    expect(h.cancel).not.toHaveBeenCalled();
  });
  // Stepping outruns speech: a queued report would describe a node the cursor has already left.
  it("replaces the reply in progress instead of queueing behind it", () => {
    const h = make();
    h.speaker.speak("Step 1");
    h.speaker.speak("Step 2");
    expect(h.cancel).toHaveBeenCalledTimes(2);
    expect(h.spoken.map(u => u.text)).toEqual(["Step 1", "Step 2"]);
  });
  // A remote voice sends the author's private chart to a third party to be synthesized.
  it("prefers an on-device voice over a better-sounding remote one", () => {
    const h = make([
      { name: "Google UK", localService: false, default: true },
      { name: "Microsoft David", localService: true, default: false },
    ]);
    h.speaker.speak("Reply");
    expect((h.spoken[0].voice as Voice).name).toBe("Microsoft David");
  });
  it("takes the default on-device voice when several are installed", () => {
    const h = make([
      { name: "Microsoft David", localService: true, default: false },
      { name: "Microsoft Zira", localService: true, default: true },
    ]);
    h.speaker.speak("Reply");
    expect((h.spoken[0].voice as Voice).name).toBe("Microsoft Zira");
  });
  it("still speaks when only a remote voice exists", () => {
    const h = make([{ name: "Google UK", localService: false, default: true }]);
    h.speaker.speak("Reply");
    expect(h.spoken).toHaveLength(1);
  });
});
