const params = new URLSearchParams(location.search);
const roomId = params.get("id");
let userName = params.get("name");

const statusEl = document.getElementById("status");
const muteBtn = document.getElementById("muteBtn");
const usersEl = document.getElementById("users");

let muted = false, ws, audioCtx;
let analyser, dataArray, silenceFrames = 0;

// === Тема ===
function toggleTheme() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  document.querySelector(".theme-toggle").textContent = isDark ? "🌙" : "🌞";
}
(function restoreTheme() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
    document.querySelector(".theme-toggle").textContent = "🌙";
  }
})();

// === GZIP ===
async function gzipCompress(data) {
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  return compressed;
}

// === Аудио ===
async function initAudio() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const input = audioCtx.createMediaStreamSource(stream);
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  input.connect(analyser);
  input.connect(processor);
  processor.connect(audioCtx.destination);

  processor.onaudioprocess = async e => {
    if (muted || !ws || ws.readyState !== WebSocket.OPEN) return;

    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const speaking = avg > 25;

    if (!speaking) {
      silenceFrames++;
      if (silenceFrames > 5) return;
    } else {
      silenceFrames = 0;
    }

    const channel = e.inputBuffer.getChannelData(0);
    const int16 = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) int16[i] = channel[i] * 0x7fff;

    try {
      const compressed = await gzipCompress(int16);
      ws.send(compressed);
    } catch (err) {
      console.warn("GZIP failed:", err);
    }
  };
}

// === Участники ===
function renderUsers(list) {
  usersEl.innerHTML = "";
  if (!list.length) {
    usersEl.innerHTML = "<p>No users yet...</p>";
    return;
  }
  list.forEach(u => {
    const div = document.createElement("div");
    div.className = "user" + (u === userName ? " self" : "") + (u.active ? " active" : "");
    div.textContent = u.name || u;
    usersEl.appendChild(div);
  });
}

// === WebSocket ===
async function connect() {
  if (!userName) {
    userName = prompt("Enter your name");
    if (!userName) {
      window.location.href = "/";
      return;
    }
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${location.hostname}:${location.port}/voice?room=${roomId}&name=${encodeURIComponent(userName)}`;
  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    statusEl.textContent = "Connected ✅";
    statusEl.className = "connected";
    initAudio();
  };

  ws.onmessage = async event => {
    if (typeof event.data === "string") {
      try {
        const data = JSON.parse(event.data);
        if (data.users) renderUsers(data.users);
        if (data.kick && data.kick.includes(userName)) {
          alert("You were disconnected!");
          window.location.href = "/";
        }
      } catch (_) {}
      return;
    }

    // === Декодирование gzip
    try {
      const ds = new DecompressionStream("gzip");
      const writer = ds.writable.getWriter();
      writer.write(event.data);
      writer.close();
      const arrayBuffer = await new Response(ds.readable).arrayBuffer();

      const int16 = new Int16Array(arrayBuffer);
      const buffer = audioCtx.createBuffer(1, int16.length, 16000);
      const float32 = buffer.getChannelData(0);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 0x7fff;

      const src = audioCtx.createBufferSource();
      src.buffer = buffer;
      src.connect(audioCtx.destination);
      src.start();
    } catch (err) {
      console.warn("Decompression failed:", err);
    }
  };

  ws.onclose = () => {
    statusEl.textContent = "Disconnected ❌";
    statusEl.className = "disconnected";
    setTimeout(() => (window.location.href = "/"), 1500);
  };
}

// === Кнопки ===
muteBtn.onclick = () => {
  muted = !muted;
  muteBtn.textContent = muted ? "Unmute" : "Mute";
  muteBtn.classList.toggle("muted", muted);
};
function leaveRoom() {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ leave: true }));
  ws.close();
}

connect();