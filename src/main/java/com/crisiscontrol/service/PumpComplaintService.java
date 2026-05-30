package com.crisiscontrol.service;

import com.crisiscontrol.dto.PumpComplaintRequest;
import com.crisiscontrol.dto.PumpComplaintResponse;
import com.crisiscontrol.entity.*;
import com.crisiscontrol.repository.PumpComplaintRepository;
import com.crisiscontrol.repository.PumpProfileRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PumpComplaintService {

    private final PumpComplaintRepository pumpComplaintRepository;
    private final PumpProfileRepository pumpProfileRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

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
                .map(this::mapToResponse)
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
}