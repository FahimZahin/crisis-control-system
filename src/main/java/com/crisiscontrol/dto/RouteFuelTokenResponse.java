package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.RouteFuelTokenStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class RouteFuelTokenResponse {

    private Long id;
    private String tokenCode;

    private Long userId;
    private String userName;
    private String phoneNumber;

    private Long vehicleId;
    private String vehicleName;
    private String numberPlate;

    private Long pumpId;
    private String pumpName;
    private String pumpAddress;

    private String sourceCity;
    private String destinationCity;
    private String stopCity;

    private BigDecimal distanceFromSourceKm;

    private FuelType fuelType;
    private BigDecimal reservedLiter;
    private BigDecimal estimatedCost;

    private BigDecimal currentOdometerAtPlanning;
    private BigDecimal expectedOdometerAtStop;
    private BigDecimal actualOdometerAtCollection;

    private String paymentMethod;
    private String bkashTransactionId;
    private BigDecimal paidAmountBdt;

    private RouteFuelTokenStatus status;

    private LocalDateTime validUntil;
    private LocalDateTime usedAt;
    private LocalDateTime cancelledAt;
    private LocalDateTime expiredAt;
    private LocalDateTime createdAt;

    private String collectionNote;
}