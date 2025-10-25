package ru.karich.model

import com.fasterxml.jackson.annotation.JsonIgnore
import org.springframework.web.socket.WebSocketSession
import java.util.concurrent.ConcurrentHashMap

data class Chamber(
    val chamberId: String,
    @JsonIgnore
    val participants: ConcurrentHashMap<WebSocketSession, Participant>,
    )

data class Participant(
    val name: String,
)
