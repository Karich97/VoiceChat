package ru.karich.service

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import ru.karich.controller.dto.CreateRequestBody
import ru.karich.model.Chamber
import java.util.concurrent.ConcurrentHashMap

@Service
class ChamberService {

    private val chambers = ConcurrentHashMap<String, Chamber>()
    private val random = java.util.Random()

    suspend fun getAllChambers(): List<String> = withContext(Dispatchers.IO) { chambers.keys.toList() }

    suspend fun getChamber(chamberId: String): Chamber = withContext(Dispatchers.IO) {
        chambers[chamberId] ?: throw ResponseStatusException(
            HttpStatus.NOT_FOUND,
            "Chamber with id '$chamberId' not found"
        )
    }

    suspend fun createChamber(body: CreateRequestBody) = withContext(Dispatchers.IO) {
        println("Participant with name ${body.name} creating new chamber...")
        val newChamber = Chamber(
            chamberId = String.format("%06d", random.nextInt(1_000_000)),
            participants = ConcurrentHashMap()
        )
        chambers[newChamber.chamberId] = newChamber
        println("new Chamber with chamber-id = ${newChamber.chamberId} Created")
        newChamber
    }

    suspend fun removeChamber(chamberId: String) = withContext(Dispatchers.IO) { chambers.remove(chamberId) }
}