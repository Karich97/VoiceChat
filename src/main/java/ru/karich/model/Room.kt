package ru.karich.model

import java.net.Socket
import java.util.UUID

data class Room(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    var clientA: Socket? = null,
    var clientB: Socket? = null
)