package ru.karich.handler

import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import ru.karich.service.RoomService
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService

@Component
class VoiceWebSocketHandler(private val roomService: RoomService) : BinaryWebSocketHandler() {

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

        sessionRoom[session] = roomId

        roomExecutors.computeIfAbsent(roomId) {
            Executors.newSingleThreadExecutor { r ->
                Thread(r, "audio-room-$roomId").apply { isDaemon = true }
            }
        }

        broadcastUsers(roomId)
        println("🎧 User joined room $roomId (session ${session.id})")
    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        val roomId = sessionRoom[session] ?: return
        val roomExecutor = roomExecutors[roomId] ?: return

        println("📦 Received binary audio: ${message.payload.remaining()} bytes from ${session.id}")

        roomExecutor.submit {
            try {
                // безопасное копирование реальных данных (только remaining())
                val buf = message.payload
                val raw = ByteArray(buf.remaining())
                buf.get(raw)

                // пересылаем всем остальным участникам комнаты
                sessionRoom
                    .filter { it.value == roomId && it.key != session }
                    .keys.forEach { other ->
                        if (other.isOpen) {
                            try {
                                other.sendMessage(BinaryMessage(raw))
                                println("📤 Forwarded ${raw.size} bytes to ${other.id}")
                            } catch (e: Exception) {
                                println("⚠️ Error sending to ${other.id}: ${e.message}")
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

        roomService.leaveRoom(roomId, Socket())
        sessionRoom.remove(session)

        if (sessionRoom.none { it.value == roomId }) {
            roomExecutors[roomId]?.shutdownNow()
            roomExecutors.remove(roomId)
            println("🛑 Closed executor for empty room $roomId")
        }

        broadcastUsers(roomId)
        println("👋 User left room $roomId (session ${session.id})")
    }

    private fun broadcastUsers(roomId: String) {
        val participants = roomService.listParticipants(roomId)
        val usersJson = participants.joinToString(prefix = "[", postfix = "]") { """{"name":"$it","active":true}""" }
        val json = """{"users":$usersJson}"""

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