import { initAudioInput } from "./audioInput.js";
import { AudioPlayer } from "./audioOutput.js";

const params = new URLSearchParams(location.search);
const roomId = params.get("chamberId");
let userName = params.get("participantName");

const statusEl = document.getElementById("status");
const muteBtn = document.getElementById("muteBtn");
const leaveBtn = document.getElementById("leaveBtn");
const usersEl = document.getElementById("users");
const waitingEl = document.getElementById("waiting");
const activeRoomEl = document.getElementById("activeRoom");

let ws, audioCtx, player;
const mutedRef = { value: false };

if (!roomId) {
  alert("Некорректный URL. Вернитесь на главную.");
  window.location.href = "/";
}

// === UI ===
function showWaiting() {
  waitingEl.style.display = "block";
  activeRoomEl.style.display = "none";
  document.getElementById("roomTitle").textContent = `🕓 Waiting Room #${roomId}`;
}

function showActiveRoom() {
  waitingEl.style.display = "none";
  activeRoomEl.style.display = "block";
  muteBtn.style.display = "inline-block";
  document.getElementById("roomHeader").textContent = `🎤 Voice Room #${roomId}`;
  startAudio();
}

// === Controls ===
muteBtn.onclick = () => {
  mutedRef.value = !mutedRef.value;
  muteBtn.textContent = mutedRef.value ? "Unmute" : "Mute";
  muteBtn.classList.toggle("muted", mutedRef.value);
  console.log("🎙 Mute toggled:", mutedRef.value);
};
leaveBtn.onclick = () => {
  ws.close();
  window.location.href = "/";
};

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copyBtn");
  if (copyBtn) copyBtn.addEventListener("click", copyInvite);

  const leaveBtn = document.getElementById("leaveBtn");
  if (leaveBtn) leaveBtn.addEventListener("click", leaveRoom);

  connect();
});

// === Start Audio ===
async function startAudio() {
  try {
    if (!audioCtx) audioCtx = new AudioContext({ sampleRate: 16000 });
    if (!player) player = new AudioPlayer(audioCtx);

    // Wake Lock, чтобы экран не тух
    if ('wakeLock' in navigator) {
      try {
        let wakeLock = await navigator.wakeLock.request('screen');
        console.log("🟢 WakeLock активирован");
        document.addEventListener('visibilitychange', async () => {
          if (wakeLock !== null && document.visibilityState === 'visible') {
            wakeLock = await navigator.wakeLock.request('screen');
          }
        });
      } catch (err) {
        console.warn("⚠ Не удалось активировать WakeLock:", err);
      }
    }

    await initAudioInput(ws, mutedRef);
    console.log("🎙 Audio input initialized");
  } catch (err) {
    console.error("❌ Ошибка инициализации аудио:", err);
  }
}

// === Invite copy ===
function copyInvite() {
  const url = `${window.location.origin}/chamber.html?chamberId=${roomId}&participantName=`;
  navigator.clipboard.writeText(url);
  const btn = document.querySelector(".copy");
  if (btn) {
    btn.textContent = "Copied ✅";
    setTimeout(() => (btn.textContent = "Copy Invite Link 📋"), 1500);
  }
}

// === Users ===
function renderUsers(list) {
  usersEl.innerHTML = list.length
    ? list.map(u => `<div class="user${u === userName ? " self" : ""}">${u.name || u}</div>`).join("")
    : "<p>No users yet...</p>";

  console.log("👥 Current users:", list);

  if (list.length >= 2) {
    console.log("🚀 Two or more users, entering active room");
    showActiveRoom();
  } else {
    console.log("⏳ Waiting for another user...");
    showWaiting();
  }
}

// === Leave room ===
function leaveRoom() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ leave: true }));
    ws.close();
  }
  window.location.href = "/";
}

// === WebSocket ===
async function connect() {
  if (!userName) userName = prompt("Enter your name") || "Guest";

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${location.hostname}:${location.port}/voice-chat?chamberId=${roomId}&participantName=${encodeURIComponent(userName)}`;
  console.log("🔌 Connecting to:", wsUrl);

  ws = new WebSocket(wsUrl);
  ws.binaryType = "arraybuffer";

  ws.onopen = () => {
    console.log("✅ WebSocket connected");
    statusEl.textContent = "Connected ✅";
    statusEl.className = "connected";
  };

  ws.onmessage = async (event) => {
    // JSON update
    if (typeof event.data === "string") {
      const data = JSON.parse(event.data);
      if (data.participants) renderUsers(data.participants);
      return;
    }

    // Audio packet
    if (event.data instanceof ArrayBuffer) {
      if (!player) return console.warn("⚠️ Получен звук, но player ещё не готов");
      await player.enqueue(event.data);
    }
  };

  ws.onclose = () => {
    console.log("🔴 WebSocket closed");
    statusEl.textContent = "Disconnected ❌";
    statusEl.className = "disconnected";
    setTimeout(() => (window.location.href = "/"), 1500);
  };
}


