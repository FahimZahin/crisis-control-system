package com.crisiscontrol.service;

import com.crisiscontrol.dto.EmergencyVehicleRequest;
import com.crisiscontrol.dto.EmergencyVehicleResponse;
import com.crisiscontrol.entity.EmergencyVehicleApprovalStatus;
import com.crisiscontrol.entity.EmergencyVehicleProfile;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.repository.EmergencyVehicleRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmergencyVehicleService {

    private final EmergencyVehicleRepository emergencyVehicleRepository;
    private final UserRepository userRepository;

    public EmergencyVehicleResponse submitOrUpdateProfile(EmergencyVehicleRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getRole() != Role.EMERGENCY_VEHICLE_AUTHORITY) {
            throw new RuntimeException("Only Emergency Vehicle Authority can submit emergency vehicle profile");
        }

        EmergencyVehicleProfile profile = emergencyVehicleRepository.findByUserId(user.getId())
                .orElse(null);

        if (profile == null) {
            if (emergencyVehicleRepository.existsByVehicleNumber(request.getVehicleNumber())) {
                throw new RuntimeException("Emergency vehicle number already exists");
            }

            if (emergencyVehicleRepository.existsByVerificationId(request.getVerificationId())) {
                throw new RuntimeException("Verification ID already exists");
            }

            profile = EmergencyVehicleProfile.builder()
                    .user(user)
                    .approvalStatus(EmergencyVehicleApprovalStatus.PENDING_APPROVAL)
                    .priorityFuelAccess(false)
                    .adminNote("Waiting for admin approval")
                    .build();
        } else {
            if (profile.getApprovalStatus() == EmergencyVehicleApprovalStatus.APPROVED) {
                throw new RuntimeException("Approved emergency vehicle profile cannot be edited for now");
            }

            if (emergencyVehicleRepository.existsByVehicleNumberAndIdNot(request.getVehicleNumber(), profile.getId())) {
                throw new RuntimeException("Emergency vehicle number already exists");
            }

            if (emergencyVehicleRepository.existsByVerificationIdAndIdNot(request.getVerificationId(), profile.getId())) {
                throw new RuntimeException("Verification ID already exists");
            }

            profile.setApprovalStatus(EmergencyVehicleApprovalStatus.PENDING_APPROVAL);
            profile.setPriorityFuelAccess(false);
            profile.setAdminNote("Profile updated. Waiting for admin approval again.");
            profile.setReviewedAt(null);
        }

        profile.setAuthorityName(request.getAuthorityName());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setOrganizationName(request.getOrganizationName());
        profile.setEmergencyVehicleType(request.getEmergencyVehicleType());
        profile.setVehicleNumber(request.getVehicleNumber());
        profile.setDriverName(request.getDriverName());
        profile.setDriverLicenseNumber(request.getDriverLicenseNumber());
        profile.setAssignedArea(request.getAssignedArea());
        profile.setVerificationId(request.getVerificationId());
        profile.setReason(request.getReason());

        EmergencyVehicleProfile savedProfile = emergencyVehicleRepository.save(profile);

        return mapToResponse(savedProfile);
    }

    public EmergencyVehicleResponse getProfileByUser(Long userId) {
        EmergencyVehicleProfile profile = emergencyVehicleRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Emergency vehicle profile not found"));

        return mapToResponse(profile);
    }

    public List<EmergencyVehicleResponse> getAllProfiles() {
        return emergencyVehicleRepository.findAllByOrderBySubmittedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public EmergencyVehicleResponse approveProfile(Long profileId) {
        EmergencyVehicleProfile profile = emergencyVehicleRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Emergency vehicle profile not found"));

        profile.setApprovalStatus(EmergencyVehicleApprovalStatus.APPROVED);
        profile.setPriorityFuelAccess(true);
        profile.setAdminNote("Approved by admin. Priority fuel access is unlocked automatically.");
        profile.setReviewedAt(LocalDateTime.now());

        EmergencyVehicleProfile savedProfile = emergencyVehicleRepository.save(profile);

        return mapToResponse(savedProfile);
    }

    public EmergencyVehicleResponse rejectProfile(Long profileId) {
        EmergencyVehicleProfile profile = emergencyVehicleRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Emergency vehicle profile not found"));

        profile.setApprovalStatus(EmergencyVehicleApprovalStatus.REJECTED);
        profile.setPriorityFuelAccess(false);
        profile.setAdminNote("Rejected by admin. Please update and resubmit valid emergency vehicle information.");
        profile.setReviewedAt(LocalDateTime.now());

        EmergencyVehicleProfile savedProfile = emergencyVehicleRepository.save(profile);

        return mapToResponse(savedProfile);
    }

    private EmergencyVehicleResponse mapToResponse(EmergencyVehicleProfile profile) {
        User user = profile.getUser();

        return EmergencyVehicleResponse.builder()
                .id(profile.getId())
                .userId(user.getId())
                .userFullName(user.getFullName())
                .userPhoneNumber(user.getPhoneNumber())
                .authorityName(profile.getAuthorityName())
                .phoneNumber(profile.getPhoneNumber())
                .organizationName(profile.getOrganizationName())
                .emergencyVehicleType(profile.getEmergencyVehicleType())
                .vehicleNumber(profile.getVehicleNumber())
                .driverName(profile.getDriverName())
                .driverLicenseNumber(profile.getDriverLicenseNumber())
                .assignedArea(profile.getAssignedArea())
                .verificationId(profile.getVerificationId())
                .reason(profile.getReason())
                .approvalStatus(profile.getApprovalStatus())
                .adminNote(profile.getAdminNote())
                .priorityFuelAccess(profile.getPriorityFuelAccess())
                .submittedAt(profile.getSubmittedAt())
                .reviewedAt(profile.getReviewedAt())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}