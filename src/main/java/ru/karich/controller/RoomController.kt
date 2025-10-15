package ru.karich.controller

import ru.karich.service.RoomService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/rooms")
class RoomController(private val roomService: RoomService) {

    @GetMapping
    fun listRooms() = roomService.listRooms()

    @PostMapping
    fun createRoom(@RequestParam name: String) = roomService.createRoom(name)
}
