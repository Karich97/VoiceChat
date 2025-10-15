package ru.karich.handler

import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import ru.karich.service.RoomService
import java.net.Socket
import java.util.concurrent.ConcurrentHashMap

@Component
class VoiceWebSocketHandler(private val roomService: RoomService) : BinaryWebSocketHandler() {

    private val socketMap = ConcurrentHashMap<WebSocketSession, Socket>() // session -> socket
    private val sessionRoom = ConcurrentHashMap<WebSocketSession, String>() // session -> roomId

    override fun afterConnectionEstablished(session: WebSocketSession) {
        val query = session.uri?.query ?: return
        val roomId = query.split("&").firstOrNull { it.startsWith("room=") }?.substringAfter("=") ?: return

        val socket = Socket() // обёртка для имитации соединения
        val room = roomService.joinRoom(roomId, socket)
        if (room == null) {
            session.close()
            return
        }

        socketMap[session] = socket
        sessionRoom[session] = roomId

        broadcastUsers(roomId)
        println("🎧 User joined room $roomId")
    }

//    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
//        val roomId = session.uri?.query?.split("&")?.firstOrNull { it.startsWith("room=") }?.substringAfter("=")
//        if (roomId != null) {
//            rooms[roomId]?.forEach { s ->
//                if (s != session && s.isOpen) s.sendMessage(message)
//            }
//        }
//    }
//
//    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
//        val roomId = sessionRoom[session] ?: return
//        val room = roomService.getRoom(roomId) ?: return
//
//        listOf(room.clientA, room.clientB).forEach { s ->
//            if (s != null && socketMap[session] != s) {
//                try {
//                    // здесь s.send() если реально работает TCP, иначе через WS
//                } catch (_: Exception) {}
//            }
//        }
//    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        val roomId = sessionRoom[session] ?: return

        sessionRoom.filter { it.value == roomId && it.key != session }.keys.forEach { otherSession ->
            if (otherSession.isOpen) {
                try {
                    otherSession.sendMessage(message)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: org.springframework.web.socket.CloseStatus) {
        val roomId = sessionRoom[session] ?: return
        val socket = socketMap[session] ?: return

        roomService.leaveRoom(roomId, socket)
        socketMap.remove(session)
        sessionRoom.remove(session)

        broadcastUsers(roomId)
        println("👋 User left room $roomId")
    }

    private fun broadcastUsers(roomId: String) {
        val participants = roomService.listParticipants(roomId)
        val json = """{"users":${participants.map { """{"name":"$it","active":true}""" }}}"""

        sessionRoom.filter { it.value == roomId }.keys.forEach { session ->
            if (session.isOpen) {
                session.sendMessage(org.springframework.web.socket.TextMessage(json))
            }
        }
    }
}
