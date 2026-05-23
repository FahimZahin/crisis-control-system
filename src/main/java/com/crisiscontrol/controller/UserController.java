package com.crisiscontrol.controller;

import com.crisiscontrol.service.UserDeleteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserDeleteService userDeleteService;

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long userId) {
        userDeleteService.deleteUserCompletely(userId);

        return ResponseEntity.ok(
                Map.of("message", "User profile and related records deleted successfully from database.")
        );
    }
}