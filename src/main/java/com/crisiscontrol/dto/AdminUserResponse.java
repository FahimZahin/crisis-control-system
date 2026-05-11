package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class AdminUserResponse {

    private Long id;
    private String fullName;
    private String phoneNumber;
    private String address;
    private Role role;
    private UserStatus status;

    private String drivingLicenseNumber;

    private String buildingName;
    private String holdingNumber;

    private String pumpName;
    private String businessLicenseNumber;

    private String hospitalName;
    private String hospitalRegistrationNumber;

    private String utilityOrganizationType;
    private String utilityEmployeeId;

    private String organizationName;
    private String organizationType;

    private String governmentEmployeeId;
    private String departmentName;

    private String localAuthorityId;
    private String district;
    private String thanaOrUpazila;

    private LocalDateTime createdAt;
}