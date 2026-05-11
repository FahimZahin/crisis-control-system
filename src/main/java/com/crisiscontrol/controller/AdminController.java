package com.crisiscontrol.controller;

import com.crisiscontrol.dto.ActivationRequestResponse;
import com.crisiscontrol.dto.AdminUserResponse;
import com.crisiscontrol.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{userId}/deactivate")
    public ResponseEntity<Map<String, String>> deactivateUser(@PathVariable Long userId) {
        adminService.deactivateUser(userId);

        return ResponseEntity.ok(
                Map.of("message", "User deactivated successfully")
        );
    }

    @PutMapping("/users/{userId}/activate")
    public ResponseEntity<Map<String, String>> activateUser(@PathVariable Long userId) {
        adminService.activateUser(userId);

        return ResponseEntity.ok(
                Map.of("message", "User activated successfully")
        );
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long userId) {
        adminService.deleteUser(userId);

        return ResponseEntity.ok(
                Map.of("message", "User deleted successfully")
        );
    }

    @GetMapping("/activation-requests")
    public ResponseEntity<List<ActivationRequestResponse>> getPendingActivationRequests() {
        return ResponseEntity.ok(adminService.getPendingActivationRequests());
    }

    @PutMapping("/activation-requests/{requestId}/approve")
    public ResponseEntity<Map<String, String>> approveActivationRequest(@PathVariable Long requestId) {
        adminService.approveActivationRequest(requestId);

        return ResponseEntity.ok(
                Map.of("message", "Activation request approved successfully")
        );
    }
}