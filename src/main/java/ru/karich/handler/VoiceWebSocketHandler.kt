package ru.karich.handler

import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import java.util.concurrent.ConcurrentHashMap
import kotlin.collections.forEach

@Component
class VoiceWebSocketHandler : BinaryWebSocketHandler() {

    private val rooms = ConcurrentHashMap<String, MutableList<WebSocketSession>>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val roomId = session.uri?.query?.split("&")?.firstOrNull { it.startsWith("room=") }?.substringAfter("=")
        if (roomId != null) {
            rooms.computeIfAbsent(roomId) { mutableListOf() }.add(session)
            println("🎧 User joined room $roomId")
        }
    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        val roomId = session.uri?.query?.split("&")?.firstOrNull { it.startsWith("room=") }?.substringAfter("=")
        if (roomId != null) {
            rooms[roomId]?.forEach { s ->
                if (s != session && s.isOpen) s.sendMessage(message)
            }
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: org.springframework.web.socket.CloseStatus) {
        rooms.values.forEach { it.remove(session) }
    }
}