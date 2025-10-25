// processor.js
class VoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.silenceFrames = 0;
    this.frameBuffer = [];
    this.frameCount = 0;
    this.lastSend = 0;
    console.log("🎧 VoiceProcessor инициализирован");
  }

  static linearToMuLaw(sample) {
    const MU = 255;
    const sign = sample < 0 ? 0x80 : 0x00;
    const x = Math.min(1, Math.max(-1, Math.abs(sample)));
    const mag = Math.log1p(MU * x) / Math.log1p(MU);
    return ((mag * 127) | 0) | sign;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    this.frameCount++;

    // уровень громкости
    let avg = 0;
    for (let i = 0; i < channel.length; i++) avg += Math.abs(channel[i]);
    avg /= channel.length;

    const speaking = avg > 0.01;

    if (!speaking) {
      this.silenceFrames++;
      if (this.silenceFrames > 10 && this.frameBuffer.length === 0) {
        if (this.silenceFrames === 11) console.log("🔇 Тишина — не отправляем пакеты");
        return true;
      }
    } else {
      if (this.silenceFrames > 10) console.log("🔊 Громкость восстановлена, отправка возобновлена");
      this.silenceFrames = 0;
    }

    // добавляем в буфер
    this.frameBuffer.push(...channel);

    // отправка каждые ~0.2-0.4 сек (примерно 3200–6400 сэмплов)
    if (this.frameBuffer.length >= 3200) {
      const uint8 = new Uint8Array(this.frameBuffer.length);
      for (let i = 0; i < this.frameBuffer.length; i++) {
        uint8[i] = VoiceProcessor.linearToMuLaw(this.frameBuffer[i]);
      }
      try {
        this.port.postMessage({ buffer: uint8.buffer }, [uint8.buffer]);
      } catch (err) {
        console.error("❌ Worklet postMessage error:", err);
      }
      this.frameBuffer = [];
    }

    return true;
  }
}

registerProcessor("voice-processor", VoiceProcessor);