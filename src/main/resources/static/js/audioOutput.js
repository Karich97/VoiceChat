// audioOutput.js
export class AudioPlayer {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.bufferedSamples = [];
    this.nextTime = audioCtx.currentTime + 0.1;
    this.resampleRatio = audioCtx.sampleRate / 16000;
    console.log("🔊 AudioPlayer ready");
  }

  // µ-law -> Float32
  static muLawToLinear(u) {
    const MU = 255;
    const sign = (u & 0x80) ? -1 : 1;
    const mag = (u & 0x7F) / 127;
    return sign * ((Math.pow(1 + MU, mag) - 1) / MU);
  }

  async enqueue(buffer) {
    const uint8 = new Uint8Array(buffer);
    for (let i = 0; i < uint8.length; i++) {
      this.bufferedSamples.push(AudioPlayer.muLawToLinear(uint8[i]));
    }

    if (this.bufferedSamples.length >= 6400) this._playBuffered();
  }

  _playBuffered() {
    const samples = Float32Array.from(this.bufferedSamples);
    this.bufferedSamples = [];

    const outLength = Math.floor(samples.length * this.resampleRatio);
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const idx = i / this.resampleRatio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      const t = idx - i0;
      resampled[i] = samples[i0] * (1 - t) + samples[i1] * t;
    }

    const buffer = this.audioCtx.createBuffer(1, resampled.length, this.audioCtx.sampleRate);
    buffer.copyToChannel(resampled, 0);

    const src = this.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.audioCtx.destination);

    if (this.nextTime < this.audioCtx.currentTime) this.nextTime = this.audioCtx.currentTime + 0.05;
    src.start(this.nextTime);
    this.nextTime += buffer.duration;

    console.log(`🎵 Played ${resampled.length} samples, next @${this.nextTime.toFixed(2)}s`);
  }
}