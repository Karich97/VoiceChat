const apiUrl = "/rooms";

// 🔹 Укажи IP сервера (public или локальный)
const SERVER_IP = location.hostname || "192.168.0.112";
const PORT = location.port || 8443; // автоматом HTTPS порт

async function fetchRooms() {
    try {
        const res = await fetch(apiUrl);
        const rooms = await res.json();

        const list = document.getElementById("roomList");
        list.innerHTML = "";

        if (rooms.length === 0) {
            list.innerHTML = "<li>No active rooms yet.</li>";
            return;
        }

        rooms.forEach(room => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${room.name}</span>
                <button onclick="joinRoom('${room.id}')">Join</button>
                <button onclick="showQr('${room.id}')">📱 QR</button>
            `;
            list.appendChild(li);
        });
    } catch (err) {
        console.error("⚠️ Failed to fetch rooms:", err);
    }
}

async function createRoom() {
    const name = document.getElementById("roomName").value.trim();
    if (!name) return alert("Please enter your name");

    try {
        const res = await fetch(`${apiUrl}?name=${encodeURIComponent(name)}`, {
            method: "POST"
        });

        if (res.ok) {
            document.getElementById("roomName").value = "";
            await fetchRooms();
        } else {
            alert("Failed to create room");
        }
    } catch (e) {
        alert("Network error");
    }
}

function joinRoom(id) {
    const userName = prompt("Enter your nickname:");
    if (!userName) return;
    window.location.href = `/room.html?id=${encodeURIComponent(id)}&name=${encodeURIComponent(userName)}`;
}

// === QR code modal ===
function showQr(roomId) {
    const qrModal = document.getElementById("qrModal");
    const qrDiv = document.getElementById("qrcode");
    const qrLink = document.getElementById("qrLink");
    qrDiv.innerHTML = "";

    const userName = prompt("Enter your nickname for this QR link:") || "guest";
    const url = `${location.protocol}//${SERVER_IP}:${PORT}/room.html?id=${roomId}&name=${encodeURIComponent(userName)}`;

    new QRCode(qrDiv, { text: url, width: 200, height: 200 });
    qrLink.textContent = url;

    qrModal.style.display = "flex";
}

document.getElementById("closeQr").onclick = () => {
    document.getElementById("qrModal").style.display = "none";
};

window.onclick = e => {
    const modal = document.getElementById("qrModal");
    if (e.target === modal) modal.style.display = "none";
};

fetchRooms();
setInterval(fetchRooms, 3000);
