package com.crisiscontrol.controller;

import com.crisiscontrol.dto.PumpStatusUpdateRequest;
import com.crisiscontrol.dto.PumpStockUpdateRequest;
import com.crisiscontrol.service.PumpProfileService;
import com.crisiscontrol.dto.PumpProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pumps")
@RequiredArgsConstructor
public class PumpProfileController {

    private final PumpProfileService pumpProfileService;

    @PostMapping("/create-from-user/{userId}")
    public ResponseEntity<PumpProfileResponse> createFromUser(@PathVariable Long userId) {
        return ResponseEntity.ok(pumpProfileService.createFromUser(userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<PumpProfileResponse> getPumpByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(pumpProfileService.getPumpByUser(userId));
    }

    @GetMapping("/{pumpId}")
    public ResponseEntity<PumpProfileResponse> getPumpById(@PathVariable Long pumpId) {
        return ResponseEntity.ok(pumpProfileService.getPumpById(pumpId));
    }

    @GetMapping("/available")
    public ResponseEntity<List<PumpProfileResponse>> getAvailablePumps() {
        return ResponseEntity.ok(pumpProfileService.getAvailablePumps());
    }

    @GetMapping
    public ResponseEntity<List<PumpProfileResponse>> getAllPumps() {
        return ResponseEntity.ok(pumpProfileService.getAllPumps());
    }

    @PutMapping("/{pumpId}/stock")
    public ResponseEntity<PumpProfileResponse> updateStock(
            @PathVariable Long pumpId,
            @Valid @RequestBody PumpStockUpdateRequest request
    ) {
        return ResponseEntity.ok(pumpProfileService.updateStock(pumpId, request));
    }

    @PutMapping("/{pumpId}/status")
    public ResponseEntity<PumpProfileResponse> updateStatus(
            @PathVariable Long pumpId,
            @Valid @RequestBody PumpStatusUpdateRequest request
    ) {
        return ResponseEntity.ok(pumpProfileService.updateStatus(pumpId, request));
    }
}