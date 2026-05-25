package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{11}$", message = "Phone number must be exactly 11 digits")
    private String phoneNumber;

    private String address;

    @NotBlank(message = "Password is required")
    private String password;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;

    @NotNull(message = "Role is required")
    private Role role;

    private String drivingLicenseNumber;

    private String buildingName;
    private String holdingNumber;
    private Integer numberOfFlats;
    private String generatorPower;
    private String buildingUnderThana;

    private String pumpName;
    private String businessLicenseNumber;
    private String pumpAddress;
    private Double fuelCapacity;
    private String fuelTypes;
    private Double currentStock;
    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    private String hospitalName;
    private String hospitalRegistrationNumber;
    private String hospitalAddress;
    private String hospitalUnderThana;
    private String hospitalGeneratorCapacity;
    private Double hospitalDieselTankCapacity;
    private Double hospitalCurrentDieselReserve;
    private String emergencyContactNumber;
    private Integer totalIcuUnits;
    private Integer acPatientCapacity;
    private Integer nonAcPatientCapacity;

    private String utilityOrganizationType;
    private String utilityEmployeeId;
    private String serviceArea;
    private String officeAddress;

    private String organizationName;
    private String organizationType;
    private String officialVerificationId;
    private String assignedArea;

    private String governmentEmployeeId;
    private String departmentName;
    private String designation;

    private String localAuthorityId;
    private String district;
    private String thanaOrUpazila;

    private String adminCode;
}