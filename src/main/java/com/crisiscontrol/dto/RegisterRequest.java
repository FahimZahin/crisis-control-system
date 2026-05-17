package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    // Common fields
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    private String address;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    @NotNull(message = "Role is required")
    private Role role;

    // Vehicle owner field
    private String drivingLicenseNumber;

    // Building manager fields
    private String buildingName;
    private String holdingNumber;
    private Integer numberOfFlats;
    private String generatorPower;

    // Pump authority fields
    private String pumpName;
    private String businessLicenseNumber;
    private String pumpAddress;
    private Double fuelCapacity;
    private String fuelTypes;
    private Double currentStock;
    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    // Hospital authority fields
    private String hospitalName;
    private String hospitalRegistrationNumber;
    private String hospitalAddress;
    private String hospitalUnderThana;
    private String hospitalGeneratorCapacity;
    private Double hospitalCurrentDieselReserve;
    private String emergencyContactNumber;

    // Utility authority fields
    private String utilityOrganizationType;
    private String utilityEmployeeId;
    private String serviceArea;
    private String officeAddress;

    // Emergency vehicle authority fields
    private String organizationName;
    private String organizationType;
    private String officialVerificationId;
    private String assignedArea;

    // Government authority fields
    private String governmentEmployeeId;
    private String departmentName;
    private String designation;

    // Local authority fields
    private String localAuthorityId;
    private String district;
    private String thanaOrUpazila;

    // Admin field
    private String adminCode;
}