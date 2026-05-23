package com.crisiscontrol.service;

import com.crisiscontrol.dto.ActivationRequestResponse;
import com.crisiscontrol.dto.AdminUserResponse;
import com.crisiscontrol.entity.ActivationRequest;
import com.crisiscontrol.entity.ActivationRequestStatus;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.ActivationRequestRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final ActivationRequestRepository activationRequestRepository;
    private final UserDeleteService userDeleteService;

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToAdminUserResponse)
                .toList();
    }

    public void deactivateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus(UserStatus.INACTIVE);
        userRepository.save(user);
    }

    public void activateUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        userDeleteService.deleteUserCompletely(userId);
    }
    public List<ActivationRequestResponse> getPendingActivationRequests() {
        return activationRequestRepository
                .findByStatusOrderByRequestedAtDesc(ActivationRequestStatus.PENDING)
                .stream()
                .map(this::mapToActivationRequestResponse)
                .toList();
    }

    public void approveActivationRequest(Long requestId) {
        ActivationRequest activationRequest = activationRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Activation request not found"));

        if (activationRequest.getStatus() != ActivationRequestStatus.PENDING) {
            throw new RuntimeException("This activation request is already reviewed");
        }

        User user = activationRequest.getUser();
        user.setStatus(UserStatus.ACTIVE);

        activationRequest.setStatus(ActivationRequestStatus.APPROVED);
        activationRequest.setReviewedAt(LocalDateTime.now());

        userRepository.save(user);
        activationRequestRepository.save(activationRequest);
    }

    private AdminUserResponse mapToAdminUserResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .address(user.getAddress())
                .role(user.getRole())
                .status(user.getStatus())
                .drivingLicenseNumber(user.getDrivingLicenseNumber())
                .buildingName(user.getBuildingName())
                .holdingNumber(user.getHoldingNumber())
                .pumpName(user.getPumpName())
                .businessLicenseNumber(user.getBusinessLicenseNumber())
                .hospitalName(user.getHospitalName())
                .hospitalRegistrationNumber(user.getHospitalRegistrationNumber())
                .utilityOrganizationType(user.getUtilityOrganizationType())
                .utilityEmployeeId(user.getUtilityEmployeeId())
                .organizationName(user.getOrganizationName())
                .organizationType(user.getOrganizationType())
                .governmentEmployeeId(user.getGovernmentEmployeeId())
                .departmentName(user.getDepartmentName())
                .localAuthorityId(user.getLocalAuthorityId())
                .district(user.getDistrict())
                .thanaOrUpazila(user.getThanaOrUpazila())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private ActivationRequestResponse mapToActivationRequestResponse(ActivationRequest activationRequest) {
        User user = activationRequest.getUser();

        return ActivationRequestResponse.builder()
                .requestId(activationRequest.getId())
                .reason(activationRequest.getReason())
                .requestStatus(activationRequest.getStatus())
                .requestedAt(activationRequest.getRequestedAt())
                .reviewedAt(activationRequest.getReviewedAt())
                .userId(user.getId())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .userStatus(user.getStatus())
                .build();
    }
}