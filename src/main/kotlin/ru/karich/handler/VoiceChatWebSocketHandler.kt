package ru.karich.handler

import jakarta.annotation.PreDestroy
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.springframework.stereotype.Component
import org.springframework.web.socket.BinaryMessage
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.TextMessage
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.handler.BinaryWebSocketHandler
import ru.karich.model.Participant
import ru.karich.service.ChamberService
import java.util.concurrent.ConcurrentHashMap

@Component
class VoiceChatWebSocketHandler(
    private val chamberService: ChamberService
): BinaryWebSocketHandler()  {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val sessions = ConcurrentHashMap<WebSocketSession, String>()

    override fun afterConnectionEstablished(session: WebSocketSession) {
        scope.launch {
            val query = session.uri?.query ?: return@launch
            val chamberId = query.split("&")
                .firstOrNull{ it.startsWith("chamberId=") }
                ?.substringAfter("=") ?: return@launch
            val participantName = query.split("&")
                .firstOrNull{ it.startsWith("participantName=") }
                ?.substringAfter("=") ?: "Guest"

            try {
                val chamber = chamberService.getChamber(chamberId)
                sessions[session] = chamber.chamberId
                chamber.participants[session] = Participant(
                    name = participantName,
                )
                println("->🎧-> User joined chamber $chamberId (session ${session.id}, name $participantName)")
                notifyParticipantsUpdate(chamberId)
            } catch (e: Exception){
                println("⚠️ Error on entering chamber $chamberId at afterConnectionEstablished : ${e.message}")
                session.close()
            }
        }
    }

    private suspend fun notifyParticipantsUpdate(chamberId: String) {
        val participants = chamberService.getChamber(chamberId).participants
        val participantsJSON = participants.values.joinToString(prefix = "[", postfix = "]"){
            """{"name":"${it.name}"}"""
        }
        val json = """{"participants":$participantsJSON}"""

        participants.forEach{
            val session = it.key
            if (session.isOpen){
                try {
                    session.sendMessage(TextMessage(json))
                } catch (e: Exception) {
                    println("⚠️ Error on notifyParticipantsUpdate ${e.message}")
                }
            }
        }
    }

    override fun afterConnectionClosed(session: WebSocketSession, status: CloseStatus) {
        scope.launch {
            val chamberId = sessions.remove(session) ?: return@launch
            try {
                val chamber = chamberService.getChamber(chamberId)
                val participants = chamber.participants
                val participantName = participants.remove(session)
                println("X🎧X User left chamber $chamberId (session ${session.id}, name $participantName)")
                if (!participants.isEmpty() && participants.size > 1){
                    notifyParticipantsUpdate(chamberId)
                } else {
                    if (!participants.isEmpty()){
                        val lastSession = participants.keys.first()
                        sessions.remove(lastSession)
                        lastSession.close()
                        println("X🎧X ${participants.values.first()} was last in chamberId $chamberId")
                    }
                    chamberService.removeChamber(chamberId)
                    println("Chamber $chamberId was removed")
                }
            } catch (e: Exception){
                println("⚠️ Error on leaving chamber $chamberId : ${e.message}")
                session.close()
            }
        }
    }

    override fun handleBinaryMessage(session: WebSocketSession, message: BinaryMessage) {
        scope.launch {
            val chamberId = sessions[session] ?: return@launch
            if (!message.payload.hasRemaining()) return@launch
            try {
                val chamber = chamberService.getChamber(chamberId)
                chamber.participants.keys.forEach { other ->
                    if (other != session && other.isOpen) {
                        other.sendMessage(message)
                    }
                }
            } catch (e: Exception){
                println("⚠️ Error on resending message among participants at chamber $chamberId : ${e.message}")
            }
        }
    }

    @PreDestroy
    fun shutdown() {
        scope.cancel()
    }
}