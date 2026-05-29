package com.crisiscontrol.controller;

import com.crisiscontrol.dto.UtilityProfileRequest;
import com.crisiscontrol.dto.UtilityProfileResponse;
import com.crisiscontrol.service.UtilityPowerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}