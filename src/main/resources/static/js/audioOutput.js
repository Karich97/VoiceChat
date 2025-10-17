export class AudioPlayer {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.queue = [];
    this.bufferedSamples = [];
    this.nextTime = audioCtx.currentTime + 0.1;
    this.resampleRatio = audioCtx.sampleRate / 16000; // 16k -> output sampleRate
    console.log("🔊 AudioPlayer ready");
  }

  async enqueue(int16) {
    // Конвертируем Int16 -> Float32
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    // Добавляем в буфер
    this.bufferedSamples.push(...float32);

    // Если накопилось >= 0.1s (примерно 1600 samples)
    if (this.bufferedSamples.length >= 1600) {
      this._playBuffered();
    }
  }

  _playBuffered() {
    // берём все накопленные сэмплы
    const samples = Float32Array.from(this.bufferedSamples);
    this.bufferedSamples = [];

    // ресемплинг до AudioContext.sampleRate
    const outLength = Math.floor(samples.length * this.resampleRatio);
    const resampled = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      const idx = i / this.resampleRatio;
      const i0 = Math.floor(idx);
      const i1 = Math.min(i0 + 1, samples.length - 1);
      const t = idx - i0;
      resampled[i] = samples[i0] * (1 - t) + samples[i1] * t; // линейная интерполяция
    }

    const buffer = this.audioCtx.createBuffer(1, resampled.length, this.audioCtx.sampleRate);
    buffer.copyToChannel(resampled, 0);

    const src = this.audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.audioCtx.destination);

    // стартуем
    if (this.nextTime < this.audioCtx.currentTime) this.nextTime = this.audioCtx.currentTime + 0.05;
    src.start(this.nextTime);
    this.nextTime += buffer.duration;
    console.log(`🎵 Played ${resampled.length} samples, next @${this.nextTime.toFixed(2)}s`);
  }
}