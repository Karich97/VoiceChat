package ru.karich.model

import com.fasterxml.jackson.annotation.JsonIgnore
import org.springframework.web.socket.WebSocketSession
import java.net.Socket
import java.util.concurrent.CopyOnWriteArrayList

data class Room(
    val id: String,
    val name: String,
    @JsonIgnore
    var clientA: Socket? = null,
    @JsonIgnore
    var clientB: Socket? = null,
    @JsonIgnore
    val participants: CopyOnWriteArrayList<Pair<String, WebSocketSession>>
)

data class Participant(
    val name: String,
    val session: WebSocketSession
)