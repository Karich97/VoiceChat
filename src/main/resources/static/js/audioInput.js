// audioInput.js
// Отправка аудио на сервер, сжатие µ-law, буферизация ~0.2-0.4с
export async function initAudioInput(ws, mutedRef) {
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  console.log("🎤 Запуск AudioContext, sampleRate:", audioCtx.sampleRate);

  await audioCtx.audioWorklet.addModule('/js/processor.js');
  console.log("🧩 Worklet модуль подключен");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  console.log("🎧 Микрофон активирован, треки:", stream.getTracks().length);

  const source = audioCtx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(audioCtx, 'voice-processor');

  worklet.port.onmessage = (event) => {
    const { buffer } = event.data;
    if (!buffer || mutedRef.value || !ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(buffer); // уже Uint8Array µ-law
  };

  source.connect(worklet);
  return audioCtx;
}

// µ-law кодирование (для processor.js)
export function linearToMuLaw(sample) {
  const MU = 255;
  const sign = sample < 0 ? 0x80 : 0x00;
  const x = Math.min(1, Math.max(-1, Math.abs(sample)));
  const mag = Math.log1p(MU * x) / Math.log1p(MU);
  return ((mag * 127) | 0) | sign;
}