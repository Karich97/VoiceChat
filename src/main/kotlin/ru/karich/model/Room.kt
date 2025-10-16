package ru.karich.model

import com.fasterxml.jackson.annotation.JsonIgnore
import java.net.Socket
import java.util.UUID

data class Room(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    @JsonIgnore
    var clientA: Socket? = null,
    @JsonIgnore
    var clientB: Socket? = null
)