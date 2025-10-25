package ru.karich

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
open class VoiceChatServerApi

fun main(args: Array<String>) {
    runApplication<VoiceChatServerApi>(*args)
}