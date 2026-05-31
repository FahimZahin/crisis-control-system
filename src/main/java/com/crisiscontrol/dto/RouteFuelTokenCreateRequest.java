package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RouteFuelTokenCreateRequest {

    private Long userId;
    private Long vehicleId;
    private Long pumpId;

    private String sourceCity;
    private String destinationCity;
    private String stopCity;

    private BigDecimal distanceFromSourceKm;
    private BigDecimal reservedLiter;
    private BigDecimal estimatedCost;

    private BigDecimal currentOdometerAtPlanning;
    private BigDecimal expectedOdometerAtStop;
}