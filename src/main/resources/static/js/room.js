import { initAudioInput } from "./audioInput.js";
import { AudioPlayer } from "./audioOutput.js";

const params = new URLSearchParams(location.search);
const roomId = params.get("id");
let userName = params.get("name");

const statusEl = document.getElementById("status");
const muteBtn = document.getElementById("muteBtn");
const usersEl = document.getElementById("users");
const waitingEl = document.getElementById("waiting");
const activeRoomEl = document.getElementById("activeRoom");

let ws, audioCtx, player;
const mutedRef = { value: false };

// === Helper UI ===
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

  // Старт аудио только теперь
  startAudio();
}

// === Invite copy ===
function copyInvite() {
  const url = `${window.location.origin}/room.html?id=${roomId}`;
  navigator.clipboard.writeText(url);
  const btn = document.querySelector(".copy");
  if (btn) {
    btn.textContent = "Copied ✅";
    setTimeout(() => (btn.textContent = "Copy Invite Link 📋"), 1500);
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

// === Start Audio ===
async function startAudio() {
  try {
    console.log("🎤 Запуск AudioContext, sampleRate: 16000");
    audioCtx = new AudioContext({ sampleRate: 16000 });

    // Важно: сначала создаём плеер, потом вход
    player = new AudioPlayer(audioCtx);
    console.log("🔊 AudioPlayer ready");

    await initAudioInput(ws, mutedRef);
    console.log("🎙 Audio input initialized");
  } catch (err) {
    console.error("❌ Ошибка инициализации аудио:", err);
  }
}

// === WebSocket ===
async function connect() {
  if (!userName) userName = prompt("Enter your name") || "Guest";

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${location.hostname}:${location.port}/voice?room=${roomId}&name=${encodeURIComponent(userName)}`;
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
      if (data.users) renderUsers(data.users);
      return;
    }

    // Audio packet
    if (event.data instanceof ArrayBuffer) {
      const int16 = new Int16Array(event.data);
      if (!player) {
        console.warn("⚠️ Получен звук, но player ещё не готов");
        return;
      }
      await player.enqueue(int16);
    }
  };

  ws.onclose = () => {
    console.log("🔴 WebSocket closed");
    statusEl.textContent = "Disconnected ❌";
    statusEl.className = "disconnected";
    setTimeout(() => (window.location.href = "/"), 1500);
  };
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

// === Controls ===
muteBtn.onclick = () => {
  mutedRef.value = !mutedRef.value;
  muteBtn.textContent = mutedRef.value ? "Unmute" : "Mute";
  muteBtn.classList.toggle("muted", mutedRef.value);
  console.log("🎙 Mute toggled:", mutedRef.value);
};

// === DOM Ready ===
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.querySelector(".copy");
  if (copyBtn) copyBtn.addEventListener("click", copyInvite);

  const leaveBtn = document.querySelector(".leave");
  if (leaveBtn) leaveBtn.addEventListener("click", leaveRoom);

  connect();
});