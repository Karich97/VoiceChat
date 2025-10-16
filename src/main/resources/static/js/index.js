const apiUrl = "/rooms";
const themeBtn = document.getElementById("themeBtn");
const createBtn = document.getElementById("createBtn");

// === Theme handling ===
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const savedTheme = localStorage.getItem("theme") || (prefersDark ? "dark" : "light");
document.documentElement.setAttribute("data-theme", savedTheme);
themeBtn.textContent = savedTheme === "dark" ? "☀️" : "🌙";

themeBtn.onclick = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  themeBtn.textContent = next === "dark" ? "☀️" : "🌙";
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