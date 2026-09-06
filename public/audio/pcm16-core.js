/** @param {ArrayLike<number>} samples */
export function pcm16(samples) {
  const buffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return buffer;
}

// Continuous 63-tap Blackman-windowed low-pass FIR, followed by fractional resampling.
// Filter history and fractional phase survive every AudioWorklet render quantum.
export class PcmEncoder {
  /** @param {number} rate */
  constructor(rate) {
    if (!Number.isFinite(rate) || rate < 16000) throw new Error("Unsupported audio sample rate.");
    this.ratio = rate / 16000;
    this.index = 0;
    this.next = 0;
    this.previous = 0;
    this.history = new Float64Array(63);
    this.cursor = 0;
    /** @type {number[]} */
    this.pending = [];
    const cutoff = 7000 / rate;
    this.weights = rate === 16000 ? [1] : Array.from({ length: 63 }, (_, i) => {
      const x = i - 31;
      const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
      return sinc * (0.42 - 0.5 * Math.cos(2 * Math.PI * i / 62) + 0.08 * Math.cos(4 * Math.PI * i / 62));
    });
    const sum = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(x => x / sum);
  }
  /** @param {Float32Array[]} channels @returns {ArrayBuffer[]} */
  push(channels) {
    const chunks = [];
    if (!channels.length) return chunks;
    for (let i = 0; i < channels[0].length; i++) {
      let mono = 0;
      for (const channel of channels) mono += channel[i] ?? 0;
      this.history[this.cursor] = mono / channels.length;
      let filtered = 0;
      for (let k = 0; k < this.weights.length; k++) filtered += this.weights[k] * this.history[(this.cursor - k + 63) % 63];
      this.cursor = (this.cursor + 1) % 63;
      while (this.next <= this.index + 1e-7) {
        const fraction = Math.max(0, Math.min(1, this.next - (this.index - 1)));
        this.pending.push(this.previous + fraction * (filtered - this.previous));
        if (this.pending.length === 1600) {
          chunks.push(pcm16(this.pending));
          this.pending = [];
        }
        this.next += this.ratio;
      }
      this.previous = filtered;
      this.index++;
    }
    return chunks;
  }
}
