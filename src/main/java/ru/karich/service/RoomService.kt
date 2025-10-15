package ru.karich.service

import ru.karich.model.Room
import org.springframework.stereotype.Service
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

@Service
class RoomService {
    private val rooms = ConcurrentHashMap<String, Room>()

    fun listRooms(): List<Room> = rooms.values.toList()

    fun createRoom(name: String): Room {
        val room = Room(name = name)
        rooms[room.id] = room
        return room
    }

    fun getRoom(id: String): Room? = rooms[id]

    fun joinRoom(id: String, socket: Socket): Room? {
        val room = rooms[id] ?: return null
        synchronized(room) {
            if (room.clientA == null) room.clientA = socket
            else if (room.clientB == null) room.clientB = socket
        }
        return room
    }
}
