const apiUrl = "/chambers";
const createBtn = document.getElementById("createBtn");
const nameInput = document.getElementById("nameInput");

// === Room creation ===
    createBtn.onclick = async () => {
        const name = nameInput.value.trim();
        if (!name) return alert("Введите имя!");

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error("Failed to create chamber");

        const chamber = await res.json();
        window.location.href = `chamber.html?chamberId=${encodeURIComponent(chamber.chamberId)}&participantName=${encodeURIComponent(name)}`;
    };

// === Room joining ===
    joinBtn.onclick = () => {
//        const name = nameInput.value.trim();
//        if (!name) return alert("Введите имя!");
        const roomNumber = document.getElementById("roomNumber").value.trim();
        if (!/^\d{6}$/.test(roomNumber)) return alert("Enter a valid 6-digit room number");
        window.location.href = `chamber.html?chamberId=${encodeURIComponent(roomNumber)}&participantName=${encodeURIComponent(name)}`;
    };

    //const list = document.getElementById("chamberList");
    //    loadChambers();
    //// Загрузить список активных комнат
    //    async function loadChambers() {
    //      const res = await fetch("/chambers");
    //      const chambers = await res.json();
    //      list.innerHTML = "";
    //
    //      if (chambers.length === 0) {
    //        list.innerHTML = "<li>Нет активных комнат</li>";
    //        return;
    //      }
    //
    //      for (const c of chambers) {
    //        const li = document.createElement("li");
    //        li.innerHTML = `<button data-id="${c.chamberId}">Комната ${c.chamberId}</button>`;
    //        li.querySelector("button").addEventListener("click", () => {
    //          const name = nameInput.value.trim();
    //          if (!name) return alert("Введите имя!");
    //          window.location.href = `chamber.html?id=${c.chamberId}&name=${encodeURIComponent(name)}`;
    //        });
    //        list.appendChild(li);
    //      }
    //    }