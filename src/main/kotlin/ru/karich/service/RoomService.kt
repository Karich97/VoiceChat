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

    /** Отключение TCP или WebSocket, очистка ресурсов комнаты */
    /** Полное удаление комнаты и освобождение всех ресурсов */
    fun leaveRoom(id: String) {
        val room = rooms.remove(id) ?: return

        // Закрываем TCP сокеты
        listOfNotNull(room.clientA, room.clientB).forEach { socket ->
            try { socket.close() } catch (_: Exception) {}
        }
        room.clientA = null
        room.clientB = null

        // Закрываем все WebSocket-сессии
        room.participants.forEach { (_, session) ->
            try { if (session.isOpen) session.close() } catch (_: Exception) {}
        }
        room.participants.clear()

        println("🗑 Room $id removed, all resources cleaned")
    }

    /** Список участников WebSocket с именами */
    fun listParticipants(id: String): List<String> {
        val room = rooms[id] ?: return emptyList()
        return room.participants.map { it.first }
    }
}
