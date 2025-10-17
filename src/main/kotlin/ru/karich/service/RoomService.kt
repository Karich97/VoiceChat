package ru.karich.service

import ru.karich.model.Room
import org.springframework.stereotype.Service
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

@Service
class RoomService {
    private val rooms = ConcurrentHashMap<String, Room>()
    private val random = java.util.Random()

    fun createRoom(name: String): Room {
        var roomId: String
        do {
            // Генерируем случайное 6-значное число как строку с ведущими нулями
            roomId = String.format("%06d", random.nextInt(1_000_000))
        } while (rooms.containsKey(roomId)) // проверяем уникальность

        val room = Room(id = roomId, name = name)
        rooms[room.id] = room
        return room
    }

    fun joinRoom(id: String, socket: Socket): Room? {
        val room = rooms[id] ?: return null
        synchronized(room) {
            if (room.clientA == null) room.clientA = socket
            else if (room.clientB == null) room.clientB = socket
        }
        return room
    }

    fun leaveRoom(id: String, socket: Socket) {
        val room = rooms[id] ?: return
        synchronized(room) {
            if (room.clientA == socket) {
                room.clientA = null
                // дисконектим второго, если есть
                room.clientB?.close()
                room.clientB = null
            } else if (room.clientB == socket) {
                room.clientB = null
            }

            // удаляем комнату, если оба вышли
            if (room.clientA == null && room.clientB == null) {
                rooms.remove(id)
            }
        }
    }

    fun listParticipants(id: String): List<String> {
        val room = rooms[id] ?: return emptyList()
        val participants = mutableListOf<String>()
        if (room.clientA != null) participants.add("Admin ${room.name}")
        if (room.clientB != null) participants.add("Guest")
        return participants
    }
}
