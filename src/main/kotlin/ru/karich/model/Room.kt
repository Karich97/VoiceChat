package ru.karich.model

import com.fasterxml.jackson.annotation.JsonIgnore
import java.net.Socket

data class Room(
    val id: String,
    val name: String,
    @JsonIgnore
    var clientA: Socket? = null,
    @JsonIgnore
    var clientB: Socket? = null
)