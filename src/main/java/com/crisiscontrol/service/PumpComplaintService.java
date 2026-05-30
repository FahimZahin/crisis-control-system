package com.crisiscontrol.service;

import com.crisiscontrol.dto.PumpComplaintRequest;
import com.crisiscontrol.dto.PumpComplaintResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.PumpComplaintRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.crisiscontrol.dto.PumpComplaintVerificationRequest;
import com.crisiscontrol.dto.PumpComplaintAdminActionRequest;
import com.crisiscontrol.repository.PumpEnforcementActionRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PumpComplaintService {

    private final PumpComplaintRepository pumpComplaintRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final PumpEnforcementActionRepository pumpEnforcementActionRepository;
    private final GovernmentPenaltyLedgerService governmentPenaltyLedgerService;

    public PumpComplaintResponse createComplaint(PumpComplaintRequest request) {
        validateCreateRequest(request);

        User complainant = userRepository.findById(request.getComplainantUserId())
                .orElseThrow(() -> new RuntimeException("Complainant user not found"));

        if (!canSubmitPumpComplaint(complainant.getRole())) {
            throw new RuntimeException("Only vehicle owner, building manager, or hospital authority can submit pump complaint");
        }

        PumpProfile pumpProfile = pumpProfileRepository.findById(request.getPumpProfileId())
                .orElseThrow(() -> new RuntimeException("Pump profile not found"));

        String pumpThana = resolvePumpThana(pumpProfile);

        PumpComplaint complaint = PumpComplaint.builder()
                .complainant(complainant)
                .pumpProfile(pumpProfile)
                .complaintType(request.getComplaintType().trim())
                .complaintTitle(request.getComplaintTitle().trim())
                .complaintDescription(request.getComplaintDescription().trim())
                .evidenceNote(cleanOptional(request.getEvidenceNote()))
                .pumpThana(pumpThana)
                .status(PumpComplaintStatus.PENDING_LOCAL_VERIFICATION)
                .build();

        PumpComplaint savedComplaint = pumpComplaintRepository.save(complaint);

        auditLogService.log(
                complainant,
                "PUMP_COMPLAINT_SUBMITTED",
                "PUMP_COMPLAINT",
                savedComplaint.getId(),
                "Vehicle owner submitted pump complaint against pump: "
                        + pumpProfile.getPumpName()
                        + ", Type: "
                        + savedComplaint.getComplaintType()
        );

        return mapToResponse(savedComplaint);
    }

    public List<PumpComplaintResponse> getAllComplaints() {
        return pumpComplaintRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PumpComplaintResponse> getComplaintsByVehicleOwner(Long userId) {
        return pumpComplaintRepository.findByComplainantIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<PumpComplaintResponse> getComplaintsForPumpOwner(Long pumpAuthorityUserId) {
        PumpProfile pumpProfile = pumpProfileRepository.findByUserId(pumpAuthorityUserId)
                .orElseThrow(() -> new RuntimeException("Pump profile not found for this pump authority"));

        return pumpComplaintRepository.findByPumpProfileIdOrderByCreatedAtDesc(pumpProfile.getId())
                .stream()
                .map(this::mapToPumpOwnerResponse)
                .toList();
    }

    public List<PumpComplaintResponse> getComplaintsForLocalAuthority(Long localAuthorityUserId) {
        User localAuthority = userRepository.findById(localAuthorityUserId)
                .orElseThrow(() -> new RuntimeException("Local authority not found"));

        if (localAuthority.getRole() != Role.LOCAL_AUTHORITY) {
            throw new RuntimeException("Only local authority can view local pump complaints");
        }

        String localThana = normalizeThanaName(localAuthority.getThanaOrUpazila());

        if (isBlank(localThana) || "-".equals(localThana)) {
            throw new RuntimeException("Local authority thana/upazila is not configured");
        }

        return pumpComplaintRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .filter(complaint -> sameText(normalizeThanaName(complaint.getPumpThana()), localThana))
                .map(this::mapToResponse)
                .toList();
    }

    public List<PumpComplaintResponse> getComplaintsForGovernment() {
        return getAllComplaints();
    }

    public List<PumpComplaintResponse> getComplaintsForAdmin() {
        return getAllComplaints();
    }

    private void validateCreateRequest(PumpComplaintRequest request) {
        if (request == null) {
            throw new RuntimeException("Complaint request is required");
        }

        if (request.getComplainantUserId() == null) {
            throw new RuntimeException("Complainant user ID is required");
        }

        if (request.getPumpProfileId() == null) {
            throw new RuntimeException("Pump is required");
        }

        if (isBlank(request.getComplaintType())) {
            throw new RuntimeException("Complaint type is required");
        }

        if (isBlank(request.getComplaintTitle())) {
            throw new RuntimeException("Complaint title is required");
        }

        if (isBlank(request.getComplaintDescription())) {
            throw new RuntimeException("Complaint description is required");
        }
    }

    private PumpComplaintResponse mapToResponse(PumpComplaint complaint) {
        User complainant = complaint.getComplainant();
        PumpProfile pumpProfile = complaint.getPumpProfile();
        User pumpOwner = pumpProfile == null ? null : pumpProfile.getUser();
        User verifiedBy = complaint.getVerifiedByLocalAuthority();

        return PumpComplaintResponse.builder()
                .id(complaint.getId())
                .complainantUserId(complainant == null ? null : complainant.getId())
                .complainantName(complainant == null ? "-" : complainant.getFullName())
                .complainantPhone(complainant == null ? "-" : complainant.getPhoneNumber())
                .pumpProfileId(pumpProfile == null ? null : pumpProfile.getId())
                .pumpName(pumpProfile == null ? "-" : pumpProfile.getPumpName())
                .pumpOwnerName(pumpOwner == null ? "-" : pumpOwner.getFullName())
                .pumpPhone(pumpOwner == null ? "-" : pumpOwner.getPhoneNumber())
                .pumpAddress(pumpProfile == null ? "-" : pumpProfile.getPumpAddress())
                .pumpThana(complaint.getPumpThana())
                .complaintType(complaint.getComplaintType())
                .complaintTitle(complaint.getComplaintTitle())
                .complaintDescription(complaint.getComplaintDescription())
                .evidenceNote(complaint.getEvidenceNote())
                .status(complaint.getStatus())
                .localAuthorityNote(complaint.getLocalAuthorityNote())
                .adminNote(complaint.getAdminNote())
                .verifiedByLocalAuthorityId(verifiedBy == null ? null : verifiedBy.getId())
                .verifiedByLocalAuthorityName(verifiedBy == null ? "-" : verifiedBy.getFullName())
                .localVerificationDecision(complaint.getLocalVerificationDecision())
                .localRecommendation(complaint.getLocalRecommendation())
                .localVerifiedAt(complaint.getLocalVerifiedAt())
                .adminActionDecision(complaint.getAdminActionDecision())
                .adminActionNote(complaint.getAdminActionNote())
                .adminActionAt(complaint.getAdminActionAt())
                .appliedRuleCode(complaint.getAppliedRuleCode())
                .appliedAdminAction(complaint.getAppliedAdminAction())
                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

    private String resolvePumpThana(PumpProfile pumpProfile) {
        if (pumpProfile == null) {
            return "-";
        }

        User pumpUser = pumpProfile.getUser();

        if (pumpUser != null && !isBlank(pumpUser.getThanaOrUpazila())) {
            return normalizeThanaName(pumpUser.getThanaOrUpazila());
        }

        return extractKnownThanaFromAddress(pumpProfile.getPumpAddress());
    }

    private String extractKnownThanaFromAddress(String address) {
        if (isBlank(address)) {
            return "-";
        }

        String normalized = address.toLowerCase();

        if (normalized.contains("gulshan") || normalized.contains("gulsan")) {
            return "Gulshan";
        }

        if (normalized.contains("sher-e-bangla") || normalized.contains("sher e bangla") || normalized.contains("shere bangla")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.contains("sabujbagh") || normalized.contains("sabuj bagh")) {
            return "Sabujbagh";
        }

        if (normalized.contains("ramna")) {
            return "Ramna";
        }

        if (normalized.contains("dhanmondi")) {
            return "Dhanmondi";
        }

        if (normalized.contains("cantonment")) {
            return "Cantonment";
        }

        if (normalized.contains("kafrul")) {
            return "Kafrul";
        }

        if (normalized.contains("paltan")) {
            return "Paltan";
        }

        if (normalized.contains("sutrapur")) {
            return "Sutrapur";
        }

        if (normalized.contains("hazaribagh")) {
            return "Hazaribagh";
        }

        if (normalized.contains("shahbagh")) {
            return "Shahbagh";
        }

        return "-";
    }

    private String normalizeThanaName(String value) {
        if (isBlank(value)) {
            return "-";
        }

        String normalized = value.trim()
                .replaceAll("\\s+", " ")
                .replace("_", " ")
                .toLowerCase();

        if (normalized.equals("gulsan") || normalized.equals("gulshan")) {
            return "Gulshan";
        }

        if (normalized.equals("sher e bangla nagar")
                || normalized.equals("sher-e-bangla nagar")
                || normalized.equals("sher-e bangla nagar")
                || normalized.equals("shere bangla nagar")
                || normalized.equals("sher bangla nagar")) {
            return "Sher-e-Bangla Nagar";
        }

        if (normalized.equals("sabuj bagh") || normalized.equals("sabujbagh")) {
            return "Sabujbagh";
        }

        if (normalized.equals("ramna")) {
            return "Ramna";
        }

        if (normalized.equals("dhanmondi")) {
            return "Dhanmondi";
        }

        if (normalized.equals("cantonment")) {
            return "Cantonment";
        }

        if (normalized.equals("kafrul")) {
            return "Kafrul";
        }

        if (normalized.equals("paltan")) {
            return "Paltan";
        }

        if (normalized.equals("sutrapur")) {
            return "Sutrapur";
        }

        if (normalized.equals("hazaribagh")) {
            return "Hazaribagh";
        }

        if (normalized.equals("shahbagh")) {
            return "Shahbagh";
        }

        return toTitleCase(normalized);
    }

    private String toTitleCase(String value) {
        if (isBlank(value)) {
            return "-";
        }

        String[] words = value.trim().split("\\s+");
        StringBuilder result = new StringBuilder();

        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }

            if (!result.isEmpty()) {
                result.append(" ");
            }

            result.append(word.substring(0, 1).toUpperCase());

            if (word.length() > 1) {
                result.append(word.substring(1).toLowerCase());
            }
        }

        return result.toString();
    }

    private boolean sameText(String first, String second) {
        if (first == null || second == null) {
            return false;
        }

        return first.trim().equalsIgnoreCase(second.trim());
    }

    private String cleanOptional(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
    private boolean canSubmitPumpComplaint(Role role) {
        return role == Role.VEHICLE_OWNER
                || role == Role.BUILDING_MANAGER
                || role == Role.HOSPITAL_AUTHORITY;
    }

    public PumpComplaintResponse verifyComplaintByLocalAuthority(
            Long complaintId,
            PumpComplaintVerificationRequest request
    ) {
        if (request == null || request.getLocalAuthorityUserId() == null) {
            throw new RuntimeException("Local authority user ID is required");
        }

        User localAuthority = userRepository.findById(request.getLocalAuthorityUserId())
                .orElseThrow(() -> new RuntimeException("Local authority user not found"));

        if (localAuthority.getRole() != Role.LOCAL_AUTHORITY) {
            throw new RuntimeException("Only local authority can verify pump complaints");
        }

        PumpComplaint complaint = pumpComplaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Pump complaint not found"));

        String localThana = normalizeThanaName(localAuthority.getThanaOrUpazila());
        String complaintPumpThana = normalizeThanaName(complaint.getPumpThana());

        if (!sameText(localThana, complaintPumpThana)) {
            throw new RuntimeException("You can verify only complaints from your assigned thana");
        }

        if (isBlank(request.getDecision())) {
            throw new RuntimeException("Verification decision is required");
        }

        String decision = request.getDecision().trim().toUpperCase();

        if (
                !decision.equals("VERIFIED_TRUE")
                        && !decision.equals("VERIFIED_FALSE")
                        && !decision.equals("NEEDS_MORE_EVIDENCE")
        ) {
            throw new RuntimeException("Invalid verification decision");
        }

        complaint.setVerifiedByLocalAuthority(localAuthority);
        complaint.setLocalVerificationDecision(decision);
        complaint.setLocalAuthorityNote(cleanOptional(request.getLocalAuthorityNote()));
        complaint.setLocalRecommendation(cleanOptional(request.getLocalRecommendation()));
        complaint.setLocalVerifiedAt(LocalDateTime.now());

        if (decision.equals("VERIFIED_TRUE")) {
            complaint.setStatus(PumpComplaintStatus.SENT_TO_ADMIN);
        } else if (decision.equals("VERIFIED_FALSE")) {
            complaint.setStatus(PumpComplaintStatus.VERIFIED_FALSE);
        } else {
            complaint.setStatus(PumpComplaintStatus.NEEDS_MORE_EVIDENCE);
        }

        PumpComplaint savedComplaint = pumpComplaintRepository.save(complaint);

        auditLogService.log(
                localAuthority,
                "PUMP_COMPLAINT_LOCAL_VERIFICATION",
                "PUMP_COMPLAINT",
                savedComplaint.getId(),
                "Local authority verified pump complaint. Decision: " + decision
        );

        return mapToResponse(savedComplaint);
    }

    public PumpComplaintResponse takeAdminAction(
            Long complaintId,
            PumpComplaintAdminActionRequest request
    ) {
        if (request == null || request.getAdminUserId() == null) {
            throw new RuntimeException("Admin user ID is required");
        }

        User admin = userRepository.findById(request.getAdminUserId())
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new RuntimeException("Only admin can take final enforcement action");
        }

        PumpComplaint complaint = pumpComplaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Pump complaint not found"));

        if (complaint.getStatus() != PumpComplaintStatus.SENT_TO_ADMIN) {
            throw new RuntimeException("Admin can take action only after local authority sends complaint to admin");
        }

        if (pumpEnforcementActionRepository.existsByPumpComplaintId(complaint.getId())) {
            throw new RuntimeException("Admin action already taken for this complaint");
        }

        if (isBlank(request.getDecision())) {
            throw new RuntimeException("Admin decision is required");
        }

        String decision = request.getDecision().trim().toUpperCase();

        if (!decision.equals("APPLY_RULE_ACTION") && !decision.equals("DISMISS")) {
            throw new RuntimeException("Invalid admin decision");
        }

        if (decision.equals("DISMISS")) {
            complaint.setStatus(PumpComplaintStatus.DISMISSED);
            complaint.setAdminActionDecision("DISMISSED");
            complaint.setAdminActionNote(cleanOptional(request.getAdminNote()));
            complaint.setAdminActionAt(LocalDateTime.now());

            PumpComplaint savedComplaint = pumpComplaintRepository.save(complaint);

            auditLogService.log(
                    admin,
                    "PUMP_COMPLAINT_DISMISSED_BY_ADMIN",
                    "PUMP_COMPLAINT",
                    savedComplaint.getId(),
                    "Admin dismissed pump complaint after local verification"
            );

            return mapToResponse(savedComplaint);
        }

        LawBookAction rule = resolveFixedRuleByComplaintType(complaint.getComplaintType());

        PumpProfile pumpProfile = complaint.getPumpProfile();

        if (pumpProfile == null) {
            throw new RuntimeException("Pump profile not found for this complaint");
        }

        PumpEnforcementAction enforcementAction = PumpEnforcementAction.builder()
                .pumpComplaint(complaint)
                .pumpProfile(pumpProfile)
                .adminUser(admin)
                .ruleCode(rule.ruleCode())
                .complaintType(complaint.getComplaintType())
                .violationTitle(rule.violationTitle())
                .adminAction(rule.allowedAdminAction())
                .penaltyAmount(rule.penaltyAmount())
                .temporaryDeactivationDays(rule.temporaryDeactivationDays())
                .governmentPenaltyCredit(rule.penaltyAmount())
                .adminNote(cleanOptional(request.getAdminNote()))
                .build();

        PumpEnforcementAction savedEnforcementAction = pumpEnforcementActionRepository.save(enforcementAction);
        governmentPenaltyLedgerService.createLedgerForEnforcementAction(savedEnforcementAction);

        if (
                rule.allowedAdminAction().contains("DEACTIVATION")
                        || rule.allowedAdminAction().contains("PERMANENT")
        ) {
            pumpProfile.setPumpStatus(PumpStatus.PENALTY_LOCKED);
            pumpProfileRepository.save(pumpProfile);
        }

        complaint.setStatus(PumpComplaintStatus.ADMIN_ACTION_TAKEN);
        complaint.setAdminActionDecision("APPLY_RULE_ACTION");
        complaint.setAdminActionNote(cleanOptional(request.getAdminNote()));
        complaint.setAdminActionAt(LocalDateTime.now());
        complaint.setAppliedRuleCode(rule.ruleCode());
        complaint.setAppliedAdminAction(rule.allowedAdminAction());

        PumpComplaint savedComplaint = pumpComplaintRepository.save(complaint);

        auditLogService.log(
                admin,
                "PUMP_COMPLAINT_ADMIN_ACTION_TAKEN",
                "PUMP_COMPLAINT",
                savedComplaint.getId(),
                "Admin applied law-book rule "
                        + rule.ruleCode()
                        + " against pump "
                        + pumpProfile.getPumpName()
                        + ". Action: "
                        + rule.allowedAdminAction()
                        + ", Penalty: "
                        + rule.penaltyAmount()
                        + " BDT"
        );

        return mapToResponse(savedComplaint);
    }

    private record LawBookAction(
            String ruleCode,
            String violationTitle,
            String allowedAdminAction,
            BigDecimal penaltyAmount,
            Integer temporaryDeactivationDays
    ) {
    }

    private LawBookAction resolveFixedRuleByComplaintType(String complaintType) {
        String type = complaintType == null ? "" : complaintType.trim().toUpperCase();

        if (type.equals("REFUSAL_OF_APPROVED_COLLECTION")) {
            return new LawBookAction(
                    "PUMP-001",
                    "Refusing approved fuel collection",
                    "WARNING_OR_TEMPORARY_DEACTIVATION",
                    new BigDecimal("5000.00"),
                    3
            );
        }

        if (type.equals("OVERCHARGING")) {
            return new LawBookAction(
                    "PUMP-002",
                    "Charging higher price than official fuel price",
                    "PENALTY_AND_TEMPORARY_DEACTIVATION",
                    new BigDecimal("15000.00"),
                    7
            );
        }

        if (type.equals("PAYMENT_WITHOUT_FUEL")) {
            return new LawBookAction(
                    "PUMP-003",
                    "Taking payment but not providing fuel",
                    "PENALTY_AND_TEMPORARY_DEACTIVATION",
                    new BigDecimal("25000.00"),
                    14
            );
        }

        if (type.equals("FALSE_STOCK_REPORTING")) {
            return new LawBookAction(
                    "PUMP-004",
                    "False stock reporting",
                    "TEMPORARY_DEACTIVATION_AND_AUDIT_REVIEW",
                    new BigDecimal("20000.00"),
                    10
            );
        }

        if (type.equals("CRITICAL_REQUEST_DISCRIMINATION")) {
            return new LawBookAction(
                    "PUMP-005",
                    "Discrimination against emergency or critical requests",
                    "HIGH_PENALTY_AND_TEMPORARY_DEACTIVATION",
                    new BigDecimal("30000.00"),
                    14
            );
        }

        throw new RuntimeException("No fixed law-book rule found for complaint type: " + complaintType);
    }
    private PumpComplaintResponse mapToPumpOwnerResponse(PumpComplaint complaint) {
        PumpProfile pumpProfile = complaint.getPumpProfile();
        User pumpOwner = pumpProfile == null ? null : pumpProfile.getUser();

        return PumpComplaintResponse.builder()
                .id(complaint.getId())

                // Hide complainant identity from pump authority
                .complainantUserId(null)
                .complainantName("Hidden for privacy")
                .complainantPhone("Hidden")

                .pumpProfileId(pumpProfile == null ? null : pumpProfile.getId())
                .pumpName(pumpProfile == null ? "-" : pumpProfile.getPumpName())
                .pumpOwnerName(pumpOwner == null ? "-" : pumpOwner.getFullName())
                .pumpPhone(pumpOwner == null ? "-" : pumpOwner.getPhoneNumber())
                .pumpAddress(pumpProfile == null ? "-" : pumpProfile.getPumpAddress())
                .pumpThana(complaint.getPumpThana())

                .complaintType(complaint.getComplaintType())
                .complaintTitle(complaint.getComplaintTitle())
                .complaintDescription(complaint.getComplaintDescription())
                .evidenceNote(complaint.getEvidenceNote())

                .status(complaint.getStatus())

                .localAuthorityNote(complaint.getLocalAuthorityNote())
                .localRecommendation(complaint.getLocalRecommendation())
                .localVerificationDecision(complaint.getLocalVerificationDecision())
                .localVerifiedAt(complaint.getLocalVerifiedAt())

                .adminNote(complaint.getAdminNote())
                .adminActionDecision(complaint.getAdminActionDecision())
                .adminActionNote(complaint.getAdminActionNote())
                .adminActionAt(complaint.getAdminActionAt())
                .appliedRuleCode(complaint.getAppliedRuleCode())
                .appliedAdminAction(complaint.getAppliedAdminAction())

                .createdAt(complaint.getCreatedAt())
                .updatedAt(complaint.getUpdatedAt())
                .build();
    }

}