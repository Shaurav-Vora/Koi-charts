/* global AudioWorkletProcessor, registerProcessor, sampleRate */
import { PcmEncoder } from "./pcm16-core.js";
class KoiPcmProcessor extends AudioWorkletProcessor {
  constructor() { super(); this.encoder = new PcmEncoder(sampleRate); }
  process(inputs) {
    const channels = inputs[0];
    if (channels?.length) {
      for (const buffer of this.encoder.push(channels)) {
        const view = new DataView(buffer);
        let energy = 0;
        for (let i = 0; i < buffer.byteLength; i += 2) energy += (view.getInt16(i, true) / 32768) ** 2;
        this.port.postMessage({ buffer, level: Math.sqrt(energy / (buffer.byteLength / 2)) }, [buffer]);
      }
    }
    // Output remains silent; the graph connection keeps the processor scheduled.
    return true;
  }
}
registerProcessor("koi-pcm16", KoiPcmProcessor);
