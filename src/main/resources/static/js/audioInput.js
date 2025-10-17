// audioInput.js
export async function initAudioInput(ws, mutedRef) {
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  console.log("🎤 Запуск AudioContext, sampleRate:", audioCtx.sampleRate);

  await audioCtx.audioWorklet.addModule('/js/processor.js');
  console.log("🧩 Worklet модуль подключен");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  console.log("🎧 Микрофон активирован, треки:", stream.getTracks().length);

  const source = audioCtx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(audioCtx, 'voice-processor');

  // получаем буферы из Worklet и отправляем по WS
  worklet.port.onmessage = (event) => {
    const { buffer } = event.data;
    if (!buffer) return;

    if (mutedRef.value) return; // если на mute — не отправляем
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(buffer);
  };

  source.connect(worklet);
  // НЕ подключаем к destination — чтобы не играть локально

  return audioCtx;
}

// AudioPlayer остаётся отдельным экспортом
export class AudioPlayer {
  constructor(audioCtx) {
    this.audioCtx = audioCtx;
    this.queue = [];
    this.bufferedSamples = [];
    this.nextTime = audioCtx.currentTime + 0.1;
    this.resampleRatio = audioCtx.sampleRate / 16000;
    console.log("🔊 AudioPlayer ready");
  }

  async enqueue(int16) {
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    this.bufferedSamples.push(...float32);
    if (this.bufferedSamples.length >= 1600) this._playBuffered();
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