package ru.karich.handler

import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import ru.karich.service.RoomService
import java.net.Socket
import java.util.concurrent.*

@Component
class VoiceWebSocketHandler(private val roomService: RoomService) : BinaryWebSocketHandler() {

    private val socketMap = ConcurrentHashMap<WebSocketSession, Socket>()
    private val sessionRoom = ConcurrentHashMap<WebSocketSession, String>()
    private val roomExecutors = ConcurrentHashMap<String, ExecutorService>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val query = session.uri?.query ?: return
        val roomId = query.split("&").firstOrNull { it.startsWith("room=") }?.substringAfter("=") ?: return

        val socket = Socket()
        val room = roomService.joinRoom(roomId, socket)
        if (room == null) {
            session.close()
            return
        }

        socketMap[session] = socket
        sessionRoom[session] = roomId

        roomExecutors.computeIfAbsent(roomId) {
            Executors.newSingleThreadExecutor { r ->
                Thread(r, "audio-room-$roomId").apply { isDaemon = true }
            }
        }

        broadcastUsers(roomId)
        println("🎧 User joined room $roomId")
    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        val roomId = sessionRoom[session] ?: return
        val roomExecutor = roomExecutors[roomId] ?: return

        roomExecutor.submit {
            try {
                val raw = message.payload.array()

                // 🔹 пересылаем всем остальным участникам комнаты без повторного gzip
                sessionRoom.filter { it.value == roomId && it.key != session }.keys.forEach { otherSession ->
                    if (otherSession.isOpen) {
                        try {
                            otherSession.sendMessage(BinaryMessage(raw))
                        } catch (e: Exception) {
                            println("⚠️ Error sending to ${otherSession.id}: ${e.message}")
                        }
                    }
                }
            } catch (e: Exception) {
                println("⚠️ Audio task failed: ${e.message}")
            }
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: org.springframework.web.socket.CloseStatus) {
        val roomId = sessionRoom[session] ?: return
        val socket = socketMap[session] ?: return

        roomService.leaveRoom(roomId, socket)
        socketMap.remove(session)
        sessionRoom.remove(session)

        if (sessionRoom.none { it.value == roomId }) {
            roomExecutors[roomId]?.shutdownNow()
            roomExecutors.remove(roomId)
            println("🛑 Closed executor for empty room $roomId")
        }

        broadcastUsers(roomId)
        println("👋 User left room $roomId")
    }

    private fun broadcastUsers(roomId: String) {
        val participants = roomService.listParticipants(roomId)
        val json = """{"users":${participants.map { """{"name":"$it","active":true}""" }}}"""

        sessionRoom.filter { it.value == roomId }.keys.forEach { session ->
            if (session.isOpen) {
                try {
                    session.sendMessage(TextMessage(json))
                } catch (e: Exception) {
                    println("⚠️ Error sending user list: ${e.message}")
                }
            }
        }
    }
}
