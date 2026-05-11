package com.crisiscontrol.service;

import com.crisiscontrol.dto.AdminUserResponse;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;

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

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userRepository.delete(user);
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
}