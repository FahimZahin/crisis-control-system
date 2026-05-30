package com.crisiscontrol.service;

import com.crisiscontrol.dto.EnforcementRuleRequest;
import com.crisiscontrol.dto.EnforcementRuleResponse;
import com.crisiscontrol.entity.EnforcementRule;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.EnforcementRuleRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EnforcementRuleService {

    private final EnforcementRuleRepository enforcementRuleRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public List<EnforcementRuleResponse> getPublicRules() {
        seedDefaultRulesIfEmpty();

        return enforcementRuleRepository.findByPublicVisibleTrueAndActiveTrueOrderByViolationCodeAsc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<EnforcementRuleResponse> getAdminRules() {
        seedDefaultRulesIfEmpty();

        return enforcementRuleRepository.findAllByOrderByViolationCodeAsc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public EnforcementRuleResponse createRule(EnforcementRuleRequest request) {
        User admin = resolveAdmin(request.getAdminUserId());
        validateRequest(request, true);

        if (enforcementRuleRepository.existsByViolationCodeIgnoreCase(request.getViolationCode().trim())) {
            throw new RuntimeException("Violation code already exists");
        }

        EnforcementRule rule = EnforcementRule.builder()
                .violationCode(request.getViolationCode().trim().toUpperCase())
                .violationTitle(request.getViolationTitle().trim())
                .complaintType(request.getComplaintType().trim())
                .description(request.getDescription().trim())
                .requiredEvidence(request.getRequiredEvidence().trim())
                .localVerificationRule(request.getLocalVerificationRule().trim())
                .allowedAdminAction(request.getAllowedAdminAction().trim())
                .penaltyAmount(request.getPenaltyAmount())
                .temporaryDeactivationDays(request.getTemporaryDeactivationDays())
                .repeatOffenseRule(cleanOptional(request.getRepeatOffenseRule()))
                .appealOption(cleanOptional(request.getAppealOption()))
                .publicVisible(request.getPublicVisible() == null || request.getPublicVisible())
                .active(request.getActive() == null || request.getActive())
                .build();

        EnforcementRule savedRule = enforcementRuleRepository.save(rule);

        auditLogService.log(
                admin,
                "ENFORCEMENT_RULE_CREATED",
                "ENFORCEMENT_RULE",
                savedRule.getId(),
                "Admin created enforcement rule: " + savedRule.getViolationCode()
        );

        return mapToResponse(savedRule);
    }

    public EnforcementRuleResponse updateRule(Long ruleId, EnforcementRuleRequest request) {
        User admin = resolveAdmin(request.getAdminUserId());

        EnforcementRule rule = enforcementRuleRepository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Enforcement rule not found"));

        validateRequest(request, false);

        if (!isBlank(request.getViolationCode())
                && !rule.getViolationCode().equalsIgnoreCase(request.getViolationCode().trim())
                && enforcementRuleRepository.existsByViolationCodeIgnoreCase(request.getViolationCode().trim())) {
            throw new RuntimeException("Violation code already exists");
        }

        if (!isBlank(request.getViolationCode())) {
            rule.setViolationCode(request.getViolationCode().trim().toUpperCase());
        }

        if (!isBlank(request.getViolationTitle())) {
            rule.setViolationTitle(request.getViolationTitle().trim());
        }

        if (!isBlank(request.getComplaintType())) {
            rule.setComplaintType(request.getComplaintType().trim());
        }

        if (!isBlank(request.getDescription())) {
            rule.setDescription(request.getDescription().trim());
        }

        if (!isBlank(request.getRequiredEvidence())) {
            rule.setRequiredEvidence(request.getRequiredEvidence().trim());
        }

        if (!isBlank(request.getLocalVerificationRule())) {
            rule.setLocalVerificationRule(request.getLocalVerificationRule().trim());
        }

        if (!isBlank(request.getAllowedAdminAction())) {
            rule.setAllowedAdminAction(request.getAllowedAdminAction().trim());
        }

        rule.setPenaltyAmount(request.getPenaltyAmount());
        rule.setTemporaryDeactivationDays(request.getTemporaryDeactivationDays());
        rule.setRepeatOffenseRule(cleanOptional(request.getRepeatOffenseRule()));
        rule.setAppealOption(cleanOptional(request.getAppealOption()));

        if (request.getPublicVisible() != null) {
            rule.setPublicVisible(request.getPublicVisible());
        }

        if (request.getActive() != null) {
            rule.setActive(request.getActive());
        }

        EnforcementRule savedRule = enforcementRuleRepository.save(rule);

        auditLogService.log(
                admin,
                "ENFORCEMENT_RULE_UPDATED",
                "ENFORCEMENT_RULE",
                savedRule.getId(),
                "Admin updated enforcement rule: " + savedRule.getViolationCode()
        );

        return mapToResponse(savedRule);
    }

    public Map<String, String> deleteRule(Long ruleId, Long adminUserId) {
        User admin = resolveAdmin(adminUserId);

        EnforcementRule rule = enforcementRuleRepository.findById(ruleId)
                .orElseThrow(() -> new RuntimeException("Enforcement rule not found"));

        rule.setActive(false);
        rule.setPublicVisible(false);

        EnforcementRule savedRule = enforcementRuleRepository.save(rule);

        auditLogService.log(
                admin,
                "ENFORCEMENT_RULE_DEACTIVATED",
                "ENFORCEMENT_RULE",
                savedRule.getId(),
                "Admin deactivated enforcement rule: " + savedRule.getViolationCode()
        );

        return Map.of("message", "Rule deactivated successfully.");
    }

    private User resolveAdmin(Long adminUserId) {
        if (adminUserId == null) {
            throw new RuntimeException("Admin user ID is required");
        }

        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only admin can manage law-book rules");
        }

        return admin;
    }

    private void validateRequest(EnforcementRuleRequest request, boolean createMode) {
        if (request == null) {
            throw new RuntimeException("Rule request is required");
        }

        if (createMode && isBlank(request.getViolationCode())) {
            throw new RuntimeException("Violation code is required");
        }

        if (createMode && isBlank(request.getViolationTitle())) {
            throw new RuntimeException("Violation title is required");
        }

        if (createMode && isBlank(request.getComplaintType())) {
            throw new RuntimeException("Complaint type is required");
        }

        if (createMode && isBlank(request.getDescription())) {
            throw new RuntimeException("Description is required");
        }

        if (createMode && isBlank(request.getRequiredEvidence())) {
            throw new RuntimeException("Required evidence is required");
        }

        if (createMode && isBlank(request.getLocalVerificationRule())) {
            throw new RuntimeException("Local verification rule is required");
        }

        if (createMode && isBlank(request.getAllowedAdminAction())) {
            throw new RuntimeException("Allowed admin action is required");
        }

        if (request.getPenaltyAmount() != null && request.getPenaltyAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Penalty amount cannot be negative");
        }

        if (request.getTemporaryDeactivationDays() != null && request.getTemporaryDeactivationDays() < 0) {
            throw new RuntimeException("Temporary deactivation days cannot be negative");
        }
    }

    private void seedDefaultRulesIfEmpty() {
        if (enforcementRuleRepository.count() > 0) {
            return;
        }

        saveDefaultRule(
                "PUMP-001",
                "Refusing approved fuel collection",
                "REFUSAL_OF_APPROVED_COLLECTION",
                "Pump refuses to provide fuel to a user with a valid approved collection request.",
                "Approved request record, collection code, user statement, pump visit report.",
                "Local authority must verify the pump location, user approval record, and pump refusal reason.",
                "WARNING_OR_TEMPORARY_DEACTIVATION",
                new BigDecimal("5000.00"),
                3,
                "Repeated refusal may lead to longer deactivation or permanent deactivation.",
                "Pump authority may submit appeal with evidence within 7 days."
        );

        saveDefaultRule(
                "PUMP-002",
                "Charging higher price than official fuel price",
                "OVERCHARGING",
                "Pump charges more than official system fuel price.",
                "Payment receipt, bKash transaction ID, cash witness, official fuel price record.",
                "Local authority must compare payment record with official fuel price and collected liters.",
                "PENALTY_AND_TEMPORARY_DEACTIVATION",
                new BigDecimal("15000.00"),
                7,
                "Repeated overcharging may lead to permanent deactivation.",
                "Pump authority may appeal by showing correct payment records."
        );

        saveDefaultRule(
                "PUMP-003",
                "Taking payment but not providing fuel",
                "PAYMENT_WITHOUT_FUEL",
                "Pump accepts payment but fails to provide approved fuel.",
                "Payment proof, collection request, pump transaction record, user statement.",
                "Local authority must verify payment and non-delivery with pump records and user evidence.",
                "PENALTY_AND_TEMPORARY_DEACTIVATION",
                new BigDecimal("25000.00"),
                14,
                "Repeated offence may lead to permanent deactivation.",
                "Pump authority may appeal with delivery proof."
        );

        saveDefaultRule(
                "PUMP-004",
                "False stock reporting",
                "FALSE_STOCK_REPORTING",
                "Pump reports incorrect stock to receive or avoid allocations.",
                "System stock record, physical inspection report, pump stock update history.",
                "Local authority must physically inspect stock and compare with system stock.",
                "TEMPORARY_DEACTIVATION_AND_AUDIT_REVIEW",
                new BigDecimal("20000.00"),
                10,
                "Repeated false reporting may lead to permanent deactivation.",
                "Pump authority may appeal with stock purchase and sales records."
        );

        saveDefaultRule(
                "PUMP-005",
                "Discrimination against emergency or critical requests",
                "CRITICAL_REQUEST_DISCRIMINATION",
                "Pump refuses or delays emergency, hospital, or approved generator fuel without valid reason.",
                "Critical request record, time log, user statement, pump response.",
                "Local authority must verify request priority and pump's stated reason for refusal or delay.",
                "HIGH_PENALTY_AND_TEMPORARY_DEACTIVATION",
                new BigDecimal("30000.00"),
                14,
                "Repeated critical discrimination may lead to permanent deactivation.",
                "Pump authority may appeal with valid shortage or safety evidence."
        );
    }

    private void saveDefaultRule(
            String code,
            String title,
            String complaintType,
            String description,
            String evidence,
            String verification,
            String action,
            BigDecimal penalty,
            Integer days,
            String repeatRule,
            String appeal
    ) {
        EnforcementRule rule = EnforcementRule.builder()
                .violationCode(code)
                .violationTitle(title)
                .complaintType(complaintType)
                .description(description)
                .requiredEvidence(evidence)
                .localVerificationRule(verification)
                .allowedAdminAction(action)
                .penaltyAmount(penalty)
                .temporaryDeactivationDays(days)
                .repeatOffenseRule(repeatRule)
                .appealOption(appeal)
                .publicVisible(true)
                .active(true)
                .build();

        enforcementRuleRepository.save(rule);
    }

    private EnforcementRuleResponse mapToResponse(EnforcementRule rule) {
        return EnforcementRuleResponse.builder()
                .id(rule.getId())
                .violationCode(rule.getViolationCode())
                .violationTitle(rule.getViolationTitle())
                .complaintType(rule.getComplaintType())
                .description(rule.getDescription())
                .requiredEvidence(rule.getRequiredEvidence())
                .localVerificationRule(rule.getLocalVerificationRule())
                .allowedAdminAction(rule.getAllowedAdminAction())
                .penaltyAmount(rule.getPenaltyAmount())
                .temporaryDeactivationDays(rule.getTemporaryDeactivationDays())
                .repeatOffenseRule(rule.getRepeatOffenseRule())
                .appealOption(rule.getAppealOption())
                .publicVisible(rule.getPublicVisible())
                .active(rule.getActive())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}