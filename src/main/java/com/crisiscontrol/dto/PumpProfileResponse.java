package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PumpStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class PumpProfileResponse {

    private Long id;

    private Long userId;
    private String ownerName;
    private String phoneNumber;

    private String pumpName;
    private String businessLicenseNumber;
    private String pumpAddress;

    private BigDecimal totalFuelCapacity;
    private BigDecimal totalCurrentStock;
    private BigDecimal totalAvailableStock;

    private String fuelTypes;

    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    private PumpStatus pumpStatus;

    private List<PumpFuelStockResponse> fuelStocks;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}