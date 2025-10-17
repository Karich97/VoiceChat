class VoiceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.silenceFrames = 0;
    this.lastSend = 0;
    this.frameBuffer = [];
    this.frameCount = 0;
    console.log("🎧 VoiceProcessor инициализирован");
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channel = input[0];
    this.frameCount++;

    // уровень громкости (mean absolute)
    let avg = 0;
    for (let i = 0; i < channel.length; i++) avg += Math.abs(channel[i]);
    avg /= channel.length;

    const speaking = avg > 0.01;

    if (!speaking) {
      this.silenceFrames++;
      if (this.silenceFrames > 10 && this.frameBuffer.length === 0) {
        if (this.silenceFrames === 11) console.log("🔇 Тишина — временно не отправляем пакеты");
        return true;
      }
    } else {
      if (this.silenceFrames > 10) console.log("🔊 Громкость восстановлена, возобновляем отправку");
      this.silenceFrames = 0;
    }

    // собираем в буфер для 0.1–0.2 сек (примерно 1600 сэмплов на 16kHz)
    this.frameBuffer.push(...channel);

    if (this.frameBuffer.length >= 1600) {
      const int16 = new Int16Array(this.frameBuffer.length);
      for (let i = 0; i < this.frameBuffer.length; i++) {
        let s = this.frameBuffer[i];
        if (s > 1) s = 1;
        if (s < -1) s = -1;
        int16[i] = Math.floor(s * 0x7fff);
      }

      try {
        this.port.postMessage({ buffer: int16.buffer }, [int16.buffer]);
      } catch (err) {
        console.error("❌ Worklet postMessage error:", err);
      }

      this.frameBuffer = [];
    }

    return true;
  }
}

registerProcessor("voice-processor", VoiceProcessor);