const apiUrl = "/rooms";
const createBtn = document.getElementById("createBtn");
const themeToggle = document.getElementById("themeToggle");
const html = document.documentElement;

// Восстанавливаем тему из localStorage или system preference
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme") || (prefersDark ? "dark" : "light");
html.setAttribute("data-theme", savedTheme);
themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";

// Обработчик клика
themeToggle.onclick = () => {
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
  localStorage.setItem("theme", next);
};

// === Room creation ===
createBtn.onclick = async () => {
  const name = document.getElementById("roomName").value.trim();
  if (!name) return alert("Please enter your name");

  try {
    createBtn.disabled = true;
    createBtn.textContent = "Creating...";

    const res = await fetch(`${apiUrl}?name=${encodeURIComponent(name)}`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to create room");

    const room = await res.json();
    window.location.href = `room.html?id=${encodeURIComponent(room.id)}&name=${encodeURIComponent(name)}`;
  } catch (err) {
    alert(err.message);
  } finally {
    createBtn.disabled = false;
    createBtn.textContent = "Create Room";
  }
};

// === Room joining ===
joinBtn.onclick = () => {
  const roomNumber = document.getElementById("roomNumber").value.trim();

  if (!/^\d{6}$/.test(roomNumber)) return alert("Enter a valid 6-digit room number");

  // Переход в комнату
  window.location.href = `room.html?id=${encodeURIComponent(roomNumber)}&name=${encodeURIComponent(name)}`;
};