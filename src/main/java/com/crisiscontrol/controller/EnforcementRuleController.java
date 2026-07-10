package com.crisiscontrol.controller;

import com.crisiscontrol.dto.EnforcementRuleRequest;
import com.crisiscontrol.dto.EnforcementRuleResponse;
import com.crisiscontrol.service.EnforcementRuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class EnforcementRuleController {

    private final EnforcementRuleService enforcementRuleService;

    // PUBLIC endpoint outside /api so it does not get blocked by API auth guard/interceptor
    @GetMapping("/public/law-book-rules")
    public ResponseEntity<List<EnforcementRuleResponse>> getPublicRulesWithoutApiPrefix() {
        return ResponseEntity.ok(enforcementRuleService.getPublicRules());
    }

    // Keep these for compatibility
    @GetMapping("/api/public/law-book")
    public ResponseEntity<List<EnforcementRuleResponse>> getPublicRules() {
        return ResponseEntity.ok(enforcementRuleService.getPublicRules());
    }

    @GetMapping("/api/law-book/public")
    public ResponseEntity<List<EnforcementRuleResponse>> getPublicRulesOldUrl() {
        return ResponseEntity.ok(enforcementRuleService.getPublicRules());
    }

    @GetMapping("/api/admin/law-book")
    public ResponseEntity<List<EnforcementRuleResponse>> getAdminRules() {
        return ResponseEntity.ok(enforcementRuleService.getAdminRules());
    }

    @PostMapping("/api/admin/law-book")
    public ResponseEntity<EnforcementRuleResponse> createRule(
            @RequestBody EnforcementRuleRequest request
    ) {
        return ResponseEntity.ok(enforcementRuleService.createRule(request));
    }

    @PutMapping("/api/admin/law-book/{ruleId}")
    public ResponseEntity<EnforcementRuleResponse> updateRule(
            @PathVariable Long ruleId,
            @RequestBody EnforcementRuleRequest request
    ) {
        return ResponseEntity.ok(enforcementRuleService.updateRule(ruleId, request));
    }

    @DeleteMapping("/api/admin/law-book/{ruleId}")
    public ResponseEntity<Map<String, String>> deleteRule(
            @PathVariable Long ruleId,
            @RequestParam Long adminUserId
    ) {
        return ResponseEntity.ok(enforcementRuleService.deleteRule(ruleId, adminUserId));
    }
}