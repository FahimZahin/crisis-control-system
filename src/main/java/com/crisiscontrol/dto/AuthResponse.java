package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class AuthResponse {

    private String token;
    private String message;
    private Long userId;
    private String fullName;
    private String phoneNumber;
    private String address;
    private Role role;
    private UserStatus status;

    // Vehicle owner registration info
    private String drivingLicenseNumber;

    // Building manager info
    private String buildingName;
    private String holdingNumber;
    private Integer numberOfFlats;
    private String generatorPower;
    private String buildingUnderThana;

    // Pump authority info
    private String pumpName;
    private String businessLicenseNumber;
    private String pumpAddress;
    private Double fuelCapacity;
    private String fuelTypes;
    private Double currentStock;
    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    // Hospital authority info
    private String hospitalName;
    private String hospitalRegistrationNumber;
    private String hospitalAddress;
    private String hospitalUnderThana;
    private String hospitalGeneratorCapacity; // kVA
    private Double hospitalDieselTankCapacity; // Liter
    private Double hospitalCurrentDieselReserve;
    private Double hospitalEstimatedBackupHours;
    private String hospitalDieselStatus;
    private String emergencyContactNumber;
    private Integer totalIcuUnits;
    private Integer acPatientCapacity;
    private Integer nonAcPatientCapacity;

    // Utility authority info
    private String utilityOrganizationType;
    private String utilityEmployeeId;
    private String serviceArea;
    private String officeAddress;

    // Emergency vehicle authority info
    private String organizationName;
    private String organizationType;
    private String officialVerificationId;
    private String assignedArea;

    // Government/local authority info
    private String governmentEmployeeId;
    private String departmentName;
    private String designation;
    private String localAuthorityId;
    private String district;
    private String thanaOrUpazila;
}