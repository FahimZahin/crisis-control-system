package com.crisiscontrol.controller;

import com.crisiscontrol.dto.VehicleRequest;
import com.crisiscontrol.dto.VehicleResponse;
import com.crisiscontrol.service.VehicleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    public ResponseEntity<VehicleResponse> createVehicle(
            @Valid @RequestBody VehicleRequest request
    ) {
        return ResponseEntity.ok(vehicleService.createVehicle(request));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<VehicleResponse>> getVehiclesByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(vehicleService.getVehiclesByUser(userId));
    }

    @GetMapping("/{vehicleId}")
    public ResponseEntity<VehicleResponse> getVehicleById(
            @PathVariable Long vehicleId
    ) {
        return ResponseEntity.ok(vehicleService.getVehicleById(vehicleId));
    }

    @PutMapping("/{vehicleId}")
    public ResponseEntity<VehicleResponse> updateVehicle(
            @PathVariable Long vehicleId,
            @Valid @RequestBody VehicleRequest request
    ) {
        return ResponseEntity.ok(vehicleService.updateVehicle(vehicleId, request));
    }

    @DeleteMapping("/{vehicleId}")
    public ResponseEntity<Map<String, String>> deleteVehicle(
            @PathVariable Long vehicleId
    ) {
        vehicleService.deleteVehicle(vehicleId);

        return ResponseEntity.ok(
                Map.of("message", "Vehicle deleted successfully")
        );
    }
}