package ru.karich

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
open class VoiceChatApplication

fun main(args: Array<String>) {
    runApplication<VoiceChatApplication>(*args)
}
