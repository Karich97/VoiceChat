package ru.karich.controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import ru.karich.controller.dto.CreateRequestBody
import ru.karich.service.ChamberService

@RestController
@RequestMapping("/chambers")
class ChatController(
    private val chamberService: ChamberService
) {
    @GetMapping
    suspend fun getAllChambers() = chamberService.getAllChambers()

    @GetMapping("/{chamberId}")
    suspend fun getChamber(@PathVariable chamberId: String) = chamberService.getChamber(chamberId)

    @PostMapping
    suspend fun createChamber(@RequestBody body: CreateRequestBody) = chamberService.createChamber(body)
}