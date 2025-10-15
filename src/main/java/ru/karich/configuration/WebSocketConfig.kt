package ru.karich.configuration

import org.springframework.context.annotation.Configuration
import org.springframework.web.socket.config.annotation.EnableWebSocket
import org.springframework.web.socket.config.annotation.WebSocketConfigurer
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry
import ru.karich.handler.VoiceWebSocketHandler

@Configuration
@EnableWebSocket
open class WebSocketConfig(private val handler: VoiceWebSocketHandler) : WebSocketConfigurer {
    override fun registerWebSocketHandlers(registry: WebSocketHandlerRegistry) {
        registry.addHandler(handler, "/voice").setAllowedOrigins("*")
    }
}