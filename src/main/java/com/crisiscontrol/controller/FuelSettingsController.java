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
@RequestMapping("/api/admin/fuel-settings")
public class FuelSettingsController {

    private final FuelSettingsService fuelSettingsService;

    @GetMapping
    public ResponseEntity<FuelSettingsResponse> getFuelSettings() {
        return ResponseEntity.ok(fuelSettingsService.getFuelSettings());
    }

    @PutMapping("/prices")
    public ResponseEntity<Map<String, String>> updateFuelPrices(
            @Valid @RequestBody FuelPriceRequest request
    ) {
        fuelSettingsService.updateFuelPrices(request);

        return ResponseEntity.ok(
                Map.of("message", "Fuel prices updated successfully")
        );
    }

    @PutMapping("/limits")
    public ResponseEntity<Map<String, String>> updateFuelLimits(
            @Valid @RequestBody FuelLimitRequest request
    ) {
        fuelSettingsService.updateFuelLimits(request);

        return ResponseEntity.ok(
                Map.of("message", "Fuel limits updated successfully")
        );
    }
}