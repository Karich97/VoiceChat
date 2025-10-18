package ru.karich.handler

import kotlinx.coroutines.*
import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import ru.karich.service.RoomService
import java.util.concurrent.ConcurrentHashMap

@Component
class VoiceWebSocketHandler(
    private val roomService: RoomService
) : BinaryWebSocketHandler() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val sessionRoom = ConcurrentHashMap<WebSocketSession, String>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        scope.launch {
            val query = session.uri?.query ?: return@launch
            val roomId = query.split("&").firstOrNull { it.startsWith("room=") }?.substringAfter("=") ?: return@launch
            val userName = query.split("&").firstOrNull { it.startsWith("name=") }?.substringAfter("=") ?: "Guest"

            val room = roomService.joinRoom(roomId, ws = session, userName = userName)
            if (room == null) {
                session.close()
                return@launch
            }

            sessionRoom[session] = roomId
            broadcastUsers(roomId)
            println("🎧 User joined room $roomId (session ${session.id}, name $userName)")
        }
    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        scope.launch {
            val roomId = sessionRoom[session] ?: return@launch
            val buf = message.payload
            val raw = ByteArray(buf.remaining())
            buf.get(raw)

            // Пересылаем всем остальным участникам комнаты
            sessionRoom.filter { it.value == roomId && it.key != session }.keys.forEach { other ->
                if (other.isOpen) {
                    try {
                        other.sendMessage(BinaryMessage(raw))
                    } catch (e: Exception) {
                        println("⚠️ Error sending to ${other.id}: ${e.message}")
                    }
                }
            }
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: org.springframework.web.socket.CloseStatus) {
        scope.launch {
            // Получаем комнату, в которой была эта сессия
            val roomId = sessionRoom.remove(session) ?: return@launch

            // Удаляем комнату полностью
            roomService.leaveRoom(roomId)

            // Также удаляем все сессии, которые могли оставаться в sessionRoom
            val sessionsToClose = sessionRoom.filter { it.value == roomId }.keys
            sessionsToClose.forEach { s ->
                try { if (s.isOpen) s.close(CloseStatus.NORMAL) } catch (_: Exception) {}
                sessionRoom.remove(s)
            }

            println("🗑 Room $roomId removed, all users disconnected")
        }
    }

    private suspend fun broadcastUsers(roomId: String) {
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