package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RoutePlanRequest {

    private Long userId;
    private Long vehicleId;

    private String sourceCity;
    private String destinationCity;

    /*
     * Optional. If empty, the system uses the saved vehicle current fuel liter.
     */
    private BigDecimal currentFuelLiter;
}