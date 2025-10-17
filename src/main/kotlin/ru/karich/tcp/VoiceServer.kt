package ru.karich.tcp

import jakarta.annotation.PostConstruct
import kotlinx.coroutines.*
import org.springframework.stereotype.Component
import ru.karich.service.RoomService
import java.net.ServerSocket
import java.net.Socket

@Component
class VoiceServer(
    private val roomService: RoomService
) {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @PostConstruct
    fun start() {
        scope.launch {
            val serverSocket = ServerSocket(5555)
            println("🎙 Voice TCP server started on port 5555")

            while (isActive) {
                val socket = serverSocket.accept()
                println("👂 New TCP connection: ${socket.inetAddress.hostAddress}")
                launch { handleClient(socket) }
            }
        }
    }

    private suspend fun handleClient(socket: Socket) = withContext(Dispatchers.IO) {
        try {
            val roomId = socket.getInputStream().bufferedReader().readLine()?.trim() ?: return@withContext

            val room = roomService.joinRoom(roomId, socket = socket)
            if (room == null) {
                println("❌ Room not found: $roomId")
                socket.close()
                return@withContext
            }

            if (room.clientA != null && room.clientB != null) {
                println("🔗 Room ${room.name} is full — starting relay")
                startRelay(room.clientA!!, room.clientB!!)
            } else {
                println("🕓 Waiting for second user in room ${room.name}")
            }
        } catch (e: Exception) {
            println("⚠ Error in client handler: ${e.message}")
            socket.close()
        }
    }

    private fun startRelay(a: Socket, b: Socket) {
        // каждая сессия TCP в отдельной корутине, неблокирующий поток
        scope.launch { VoiceSession(a, b).start() }
        scope.launch { VoiceSession(b, a).start() }
    }
}