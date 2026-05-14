package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelRequestSource;
import com.crisiscontrol.entity.FuelRequestStatus;
import com.crisiscontrol.entity.FuelType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class FuelRequestResponse {

    private Long id;

    private Long userId;
    private String userName;
    private String phoneNumber;

    private FuelRequestSource requestSource;

    private Long vehicleId;
    private String vehicleBrand;
    private String vehicleModel;
    private String vehicleNumberPlate;
    private String vehicleType;

    private Long emergencyProfileId;
    private String emergencyAuthorityName;
    private String emergencyOrganizationName;
    private String emergencyVehicleType;
    private String emergencyVehicleNumber;
    private String emergencyDriverName;
    private String emergencyDriverLicenseNumber;
    private String emergencyAssignedArea;
    private String emergencyVerificationId;
    private String emergencyReason;

    private Long pumpId;
    private String pumpName;
    private String pumpAddress;

    private FuelType fuelType;
    private BigDecimal requestedLiter;
    private String fuelLevelStatus;
    private BigDecimal pricePerUnit;
    private BigDecimal estimatedCost;

    private String collectionCode;

    private FuelRequestStatus requestStatus;
    private String adminNote;

    private LocalDateTime collectedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}