const apiUrl = "/rooms";
const createBtn = document.getElementById("createBtn");

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