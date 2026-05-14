package com.crisiscontrol.controller;

import com.crisiscontrol.dto.*;
import com.crisiscontrol.service.UtilityPowerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class UtilityPowerController {

    private final UtilityPowerService utilityPowerService;

    @PostMapping("/api/utility/profile")
    public ResponseEntity<UtilityProfileResponse> createOrUpdateUtilityProfile(
            @Valid @RequestBody UtilityProfileRequest request
    ) {
        return ResponseEntity.ok(utilityPowerService.createOrUpdateUtilityProfile(request));
    }

    @GetMapping("/api/utility/profile/user/{userId}")
    public ResponseEntity<UtilityProfileResponse> getUtilityProfileByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(utilityPowerService.getUtilityProfileByUser(userId));
    }

    @PostMapping("/api/power-outages")
    public ResponseEntity<PowerOutageResponse> createPowerOutage(
            @Valid @RequestBody PowerOutageRequest request
    ) {
        return ResponseEntity.ok(utilityPowerService.createPowerOutage(request));
    }

    @GetMapping("/api/power-outages")
    public ResponseEntity<List<PowerOutageResponse>> getAllPowerOutages() {
        return ResponseEntity.ok(utilityPowerService.getAllPowerOutages());
    }

    @GetMapping("/api/power-outages/active")
    public ResponseEntity<List<PowerOutageResponse>> getActivePowerOutages() {
        return ResponseEntity.ok(utilityPowerService.getActivePowerOutages());
    }

    @GetMapping("/api/power-outages/user/{userId}")
    public ResponseEntity<List<PowerOutageResponse>> getPowerOutagesByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(utilityPowerService.getPowerOutagesByUser(userId));
    }

    @GetMapping("/api/power-outages/thana/{thanaName}/recent")
    public ResponseEntity<List<PowerOutageResponse>> getRecentPowerOutagesByThana(
            @PathVariable String thanaName
    ) {
        return ResponseEntity.ok(utilityPowerService.getRecentPowerOutagesByThana(thanaName));
    }

    @PutMapping("/api/power-outages/{id}")
    public ResponseEntity<PowerOutageResponse> updatePowerOutage(
            @PathVariable Long id,
            @Valid @RequestBody PowerOutageRequest request
    ) {
        return ResponseEntity.ok(utilityPowerService.updatePowerOutage(id, request));
    }

    @DeleteMapping("/api/power-outages/{id}")
    public ResponseEntity<Map<String, String>> deletePowerOutage(
            @PathVariable Long id
    ) {
        utilityPowerService.deletePowerOutage(id);
        return ResponseEntity.ok(Map.of("message", "Power outage notice deleted successfully"));
    }
}