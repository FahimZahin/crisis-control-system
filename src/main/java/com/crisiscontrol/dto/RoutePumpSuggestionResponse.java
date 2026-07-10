package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PumpStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class RoutePumpSuggestionResponse {

    private Long pumpId;
    private String pumpName;
    private String pumpAddress;
    private String ownerName;
    private String phoneNumber;

    private PumpStatus pumpStatus;
    private String fuelTypes;
    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    private BigDecimal totalCurrentStock;
    private BigDecimal matchingFuelStock;

    private String recommendationLevel;
    private String recommendationReason;
    private String routeMatchNote;
}