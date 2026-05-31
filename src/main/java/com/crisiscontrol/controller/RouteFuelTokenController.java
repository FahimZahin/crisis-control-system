package com.crisiscontrol.controller;

import com.crisiscontrol.dto.RouteFuelTokenCollectRequest;
import com.crisiscontrol.dto.RouteFuelTokenCreateRequest;
import com.crisiscontrol.dto.RouteFuelTokenResponse;
import com.crisiscontrol.service.RouteFuelTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/route-fuel-tokens")
@RequiredArgsConstructor
public class RouteFuelTokenController {

    private final RouteFuelTokenService routeFuelTokenService;

    @PostMapping
    public ResponseEntity<RouteFuelTokenResponse> createRouteFuelToken(
            @RequestBody RouteFuelTokenCreateRequest request
    ) {
        return ResponseEntity.ok(routeFuelTokenService.createRouteFuelToken(request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RouteFuelTokenResponse>> getTokensByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(routeFuelTokenService.getTokensByUser(userId));
    }

    @GetMapping("/pump-user/{pumpUserId}")
    public ResponseEntity<List<RouteFuelTokenResponse>> getTokensByPumpUser(
            @PathVariable Long pumpUserId
    ) {
        return ResponseEntity.ok(routeFuelTokenService.getTokensByPumpUser(pumpUserId));
    }

    @PutMapping("/collect")
    public ResponseEntity<RouteFuelTokenResponse> collectRouteFuelToken(
            @RequestBody RouteFuelTokenCollectRequest request
    ) {
        return ResponseEntity.ok(routeFuelTokenService.collectRouteFuelToken(request));
    }

    @PutMapping("/expire-old")
    public ResponseEntity<String> expireOldTokens() {
        routeFuelTokenService.expireOldTokens();
        return ResponseEntity.ok("Old route fuel tokens expired successfully");
    }
}