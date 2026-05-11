package com.crisiscontrol.controller;

import com.crisiscontrol.service.UserActivationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users")
public class UserActivationController {

    private final UserActivationService userActivationService;

    @PostMapping("/{userId}/activation-request")
    public ResponseEntity<Map<String, String>> requestActivation(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request
    ) {
        userActivationService.requestActivation(userId, request.get("reason"));

        return ResponseEntity.ok(
                Map.of("message", "Activation request submitted successfully")
        );
    }
}