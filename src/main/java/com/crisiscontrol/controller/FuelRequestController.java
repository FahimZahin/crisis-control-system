package com.crisiscontrol.controller;

import com.crisiscontrol.dto.EmergencyFuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelCollectionRequest;
import com.crisiscontrol.dto.FuelRequestCreateRequest;
import com.crisiscontrol.dto.FuelRequestDecisionRequest;
import com.crisiscontrol.dto.FuelRequestResponse;
import com.crisiscontrol.dto.HospitalGeneratorFuelRequestCreateRequest;
import com.crisiscontrol.service.FuelRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class FuelRequestController {

    private final FuelRequestService fuelRequestService;

    @PostMapping("/api/fuel-requests")
    public ResponseEntity<FuelRequestResponse> createFuelRequest(
            @Valid @RequestBody FuelRequestCreateRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.createFuelRequest(request));
    }

    @GetMapping("/api/fuel-requests/user/{userId}")
    public ResponseEntity<List<FuelRequestResponse>> getUserFuelRequests(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(fuelRequestService.getUserFuelRequests(userId));
    }

    @PostMapping("/api/emergency-fuel-requests")
    public ResponseEntity<FuelRequestResponse> createEmergencyFuelRequest(
            @Valid @RequestBody EmergencyFuelRequestCreateRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.createEmergencyFuelRequest(request));
    }

    @GetMapping("/api/emergency-fuel-requests/user/{userId}")
    public ResponseEntity<List<FuelRequestResponse>> getEmergencyFuelRequestsByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(fuelRequestService.getEmergencyFuelRequestsByUser(userId));
    }

    @PostMapping("/api/hospital-generator-fuel-requests")
    public ResponseEntity<FuelRequestResponse> createHospitalGeneratorFuelRequest(
            @Valid @RequestBody HospitalGeneratorFuelRequestCreateRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.createHospitalGeneratorFuelRequest(request));
    }

    @GetMapping("/api/hospital-generator-fuel-requests/user/{userId}")
    public ResponseEntity<List<FuelRequestResponse>> getHospitalGeneratorFuelRequestsByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(fuelRequestService.getHospitalGeneratorFuelRequestsByUser(userId));
    }

    @GetMapping("/api/admin/fuel-requests")
    public ResponseEntity<List<FuelRequestResponse>> getAllFuelRequests() {
        return ResponseEntity.ok(fuelRequestService.getAllFuelRequests());
    }

    @PutMapping("/api/admin/fuel-requests/{requestId}/approve")
    public ResponseEntity<FuelRequestResponse> approveFuelRequest(
            @PathVariable Long requestId,
            @Valid @RequestBody FuelRequestDecisionRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.approveFuelRequest(requestId, request));
    }

    @PutMapping("/api/admin/fuel-requests/{requestId}/reject")
    public ResponseEntity<FuelRequestResponse> rejectFuelRequest(
            @PathVariable Long requestId,
            @RequestBody FuelRequestDecisionRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.rejectFuelRequest(requestId, request));
    }

    @GetMapping("/api/pumps/{pumpId}/assigned-fuel-requests")
    public ResponseEntity<List<FuelRequestResponse>> getApprovedRequestsByPump(
            @PathVariable Long pumpId
    ) {
        return ResponseEntity.ok(fuelRequestService.getApprovedRequestsByPump(pumpId));
    }

    @PutMapping("/api/pumps/fuel-requests/collect")
    public ResponseEntity<FuelRequestResponse> collectFuelByCode(
            @Valid @RequestBody FuelCollectionRequest request
    ) {
        return ResponseEntity.ok(fuelRequestService.collectFuelByCode(request));
    }
}