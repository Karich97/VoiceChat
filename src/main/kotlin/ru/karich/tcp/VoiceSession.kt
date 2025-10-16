package ru.karich.tcp

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.net.Socket

class VoiceSession(
    private val from: Socket,
    private val to: Socket
) {
    suspend fun start() = withContext(Dispatchers.IO) {
        try {
            val input = from.getInputStream()
            val output = to.getOutputStream()
            val buffer = ByteArray(2048)

            println("🎧 Starting voice relay: ${from.inetAddress.hostAddress} → ${to.inetAddress.hostAddress}")

            while (true) {
                val read = input.read(buffer)
                if (read == -1) break
                output.write(buffer, 0, read)
                output.flush()
            }
        } catch (e: IOException) {
            println("❌ Session closed: ${e.message}")
        } finally {
            from.close()
            to.close()
        }
    }
}
