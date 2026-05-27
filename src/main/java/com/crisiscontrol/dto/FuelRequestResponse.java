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

    private BigDecimal previousOdometerReading;
    private BigDecimal requestOdometerReading;
    private BigDecimal collectionOdometerReading;
    private BigDecimal distanceTravelled;
    private BigDecimal fullTankRangeKm;
    private BigDecimal estimatedRemainingRangeKm;
    private Boolean odometerEligible;

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

    private String hospitalName;
    private String hospitalRegistrationNumber;
    private String hospitalAddress;
    private String affectedThana;
    private String generatorCapacity;
    private String hospitalUrgencyLevel;
    private String hospitalReason;
    private String hospitalContactNumber;
    private Double hospitalCurrentDieselReserve;
    private Double hospitalEstimatedBackupHours;
    private String hospitalDieselStatus;

    private String buildingName;
    private String buildingHoldingNumber;
    private String buildingAddress;
    private String buildingThana;
    private String buildingGeneratorPower;
    private Integer buildingNumberOfFlats;
    private String buildingReason;
    private String buildingContactNumber;

    private Long pumpId;
    private String pumpName;
    private String pumpAddress;

    private FuelType fuelType;
    private BigDecimal requestedLiter;
    private BigDecimal requestedAmountBdt;
    private Boolean extraFuelRequested;
    private String extraFuelReasonType;
    private String extraFuelDemandMessage;
    private String fuelLevelStatus;
    private BigDecimal pricePerUnit;
    private BigDecimal estimatedCost;

    private String collectionCode;
    private FuelRequestStatus requestStatus;
    private String adminNote;

    private String paymentMethod;
    private BigDecimal cashAmountBdt;
    private String bkashTransactionId;
    private BigDecimal paidAmountBdt;
    private LocalDateTime paymentRecordedAt;

    private LocalDateTime collectedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}