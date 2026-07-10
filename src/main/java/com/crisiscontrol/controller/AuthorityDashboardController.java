package com.crisiscontrol.controller;

import com.crisiscontrol.service.AuthorityDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/authority")
public class AuthorityDashboardController {

    private final AuthorityDashboardService authorityDashboardService;

    @GetMapping("/government/dashboard")
    public ResponseEntity<Map<String, Object>> getGovernmentDashboard() {
        return ResponseEntity.ok(authorityDashboardService.getGovernmentDashboard());
    }

    @GetMapping("/local/dashboard/{userId}")
    public ResponseEntity<Map<String, Object>> getLocalAuthorityDashboard(@PathVariable Long userId) {
        return ResponseEntity.ok(authorityDashboardService.getLocalAuthorityDashboard(userId));
    }
}