package com.crisiscontrol.controller;

import com.crisiscontrol.dto.PumpComplaintRequest;
import com.crisiscontrol.dto.PumpComplaintResponse;
import com.crisiscontrol.service.PumpComplaintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.crisiscontrol.dto.PumpComplaintVerificationRequest;
import com.crisiscontrol.dto.PumpComplaintAdminActionRequest;

import java.util.List;

@RestController
@RequestMapping("/api/pump-complaints")
@RequiredArgsConstructor
public class PumpComplaintController {

    private final PumpComplaintService pumpComplaintService;

    @PostMapping
    public ResponseEntity<PumpComplaintResponse> createComplaint(
            @RequestBody PumpComplaintRequest request
    ) {
        return ResponseEntity.ok(pumpComplaintService.createComplaint(request));
    }

    @GetMapping
    public ResponseEntity<List<PumpComplaintResponse>> getAllComplaints() {
        return ResponseEntity.ok(pumpComplaintService.getAllComplaints());
    }

    @GetMapping("/vehicle-owner/{userId}")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsByVehicleOwner(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsByVehicleOwner(userId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsByUser(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsByVehicleOwner(userId));
    }

    @GetMapping("/pump-owner/{userId}")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsForPumpOwner(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsForPumpOwner(userId));
    }

    @GetMapping("/government")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsForGovernment() {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsForGovernment());
    }

    @GetMapping("/admin")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsForAdmin() {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsForAdmin());
    }

    @GetMapping("/local-authority/{userId}")
    public ResponseEntity<List<PumpComplaintResponse>> getComplaintsForLocalAuthority(
            @PathVariable Long userId
    ) {
        return ResponseEntity.ok(pumpComplaintService.getComplaintsForLocalAuthority(userId));
    }
    @PutMapping("/{complaintId}/local-verification")
    public ResponseEntity<PumpComplaintResponse> verifyComplaintByLocalAuthority(
            @PathVariable Long complaintId,
            @RequestBody PumpComplaintVerificationRequest request
    ) {
        return ResponseEntity.ok(
                pumpComplaintService.verifyComplaintByLocalAuthority(complaintId, request)
        );
    }

    @PutMapping("/{complaintId}/admin-action")
    public ResponseEntity<PumpComplaintResponse> takeAdminAction(
            @PathVariable Long complaintId,
            @RequestBody PumpComplaintAdminActionRequest request
    ) {
        return ResponseEntity.ok(
                pumpComplaintService.takeAdminAction(complaintId, request)
        );
    }
}