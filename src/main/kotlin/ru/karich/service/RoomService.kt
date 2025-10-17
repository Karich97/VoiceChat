package ru.karich.service

import org.springframework.stereotype.Service
import ru.karich.model.Room
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

@Service
class RoomService {

    private val rooms = ConcurrentHashMap<String, Room>()
    private val random = java.util.Random()

    /** Создание комнаты с заданным именем */
    fun createRoom(name: String): Room {
        val room = Room(
            // Генерируем случайное 6-значное число как строку с ведущими нулями
            id = String.format("%06d", random.nextInt(1_000_000)),
            name = name,
            clientA = null,
            clientB = null,
            participants = CopyOnWriteArrayList()
        )
        rooms[room.id] = room
        return room
    }

    /** Подключение TCP или WebSocket */
    fun joinRoom(
        id: String,
        socket: Socket? = null,
        ws: org.springframework.web.socket.WebSocketSession? = null,
        userName: String? = null
    ): Room? {
        val room = rooms[id] ?: return null

        socket?.let {
            if (room.clientA == null) room.clientA = it
            else if (room.clientB == null) room.clientB = it
        }

        ws?.let { session ->
            val name = userName ?: "Guest"
            if (room.participants.none { it.second.id == session.id }) {
                room.participants.add(Pair(name, session))
            }
        }

        return room
    }

    /** Отключение TCP или WebSocket */
    fun leaveRoom(
        id: String,
        socket: Socket? = null,
        ws: org.springframework.web.socket.WebSocketSession? = null
    ) {
        val room = rooms[id] ?: return

        socket?.let {
            if (room.clientA == it) room.clientA = null
            else if (room.clientB == it) room.clientB = null
        }

        ws?.let { session ->
            room.participants.removeIf { it.second.id == session.id }
        }

        // Если TCP клиентов нет, оставшихся отключаем
        if (room.clientA == null && room.clientB == null) {
            room.clientA?.close(); room.clientA = null
            room.clientB?.close(); room.clientB = null
        }

        // Если никого нет — удаляем комнату
        if (room.clientA == null && room.clientB == null && room.participants.isEmpty()) {
            rooms.remove(id)
        }
    }

    /** Список участников WebSocket с именами */
    fun listParticipants(id: String): List<String> {
        val room = rooms[id] ?: return emptyList()
        return room.participants.map { it.first }
    }
}
