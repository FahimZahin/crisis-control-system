package com.crisiscontrol.controller;

import com.crisiscontrol.dto.FuelLimitRequest;
import com.crisiscontrol.dto.FuelPriceRequest;
import com.crisiscontrol.dto.FuelSettingsResponse;
import com.crisiscontrol.service.FuelSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FuelSettingsController {

    private final FuelSettingsService fuelSettingsService;

    /*
     * Public fuel settings endpoint.
     * Vehicle owner pages need this to calculate requested amount in BDT.
     */
    @GetMapping("/api/fuel-settings")
    public ResponseEntity<FuelSettingsResponse> getPublicFuelSettings() {
        return ResponseEntity.ok(fuelSettingsService.getFuelSettings());
    }

    /*
     * Admin fuel settings endpoint.
     * Keep this for admin fuel settings page.
     */
    @GetMapping("/api/admin/fuel-settings")
    public ResponseEntity<FuelSettingsResponse> getAdminFuelSettings() {
        return ResponseEntity.ok(fuelSettingsService.getFuelSettings());
    }

    @PutMapping("/api/admin/fuel-settings/prices")
    public ResponseEntity<Map<String, String>> updateFuelPrices(
            @Valid @RequestBody FuelPriceRequest request
    ) {
        fuelSettingsService.updateFuelPrices(request);

        return ResponseEntity.ok(
                Map.of("message", "Fuel prices updated successfully")
        );
    }

    @PutMapping("/api/admin/fuel-settings/limits")
    public ResponseEntity<Map<String, String>> updateFuelLimits(
            @Valid @RequestBody FuelLimitRequest request
    ) {
        fuelSettingsService.updateFuelLimits(request);

        return ResponseEntity.ok(
                Map.of("message", "Fuel limits updated successfully")
        );
    }
}