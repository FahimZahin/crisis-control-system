package com.crisiscontrol.controller;

import com.crisiscontrol.dto.EmergencyVehicleRequest;
import com.crisiscontrol.dto.EmergencyVehicleResponse;
import com.crisiscontrol.service.EmergencyVehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EmergencyVehicleController {

    private final EmergencyVehicleService emergencyVehicleService;

    @PostMapping("/api/emergency-vehicles")
    public ResponseEntity<EmergencyVehicleResponse> submitOrUpdateProfile(
            @Valid @RequestBody EmergencyVehicleRequest request
    ) {
        return ResponseEntity.ok(emergencyVehicleService.submitOrUpdateProfile(request));
    }

    @GetMapping("/api/emergency-vehicles/user/{userId}")
    public ResponseEntity<EmergencyVehicleResponse> getProfileByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(emergencyVehicleService.getProfileByUser(userId));
    }

    @GetMapping("/api/admin/emergency-vehicles")
    public ResponseEntity<List<EmergencyVehicleResponse>> getAllProfiles() {
        return ResponseEntity.ok(emergencyVehicleService.getAllProfiles());
    }

    @PutMapping("/api/admin/emergency-vehicles/{profileId}/approve")
    public ResponseEntity<EmergencyVehicleResponse> approveProfile(
            @PathVariable Long profileId
    ) {
        return ResponseEntity.ok(emergencyVehicleService.approveProfile(profileId));
    }

    @PutMapping("/api/admin/emergency-vehicles/{profileId}/reject")
    public ResponseEntity<EmergencyVehicleResponse> rejectProfile(
            @PathVariable Long profileId
    ) {
        return ResponseEntity.ok(emergencyVehicleService.rejectProfile(profileId));
    }
}