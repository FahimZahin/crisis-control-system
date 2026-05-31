package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class RoutePlanResponse {

    private String sourceCity;
    private String destinationCity;
    private BigDecimal routeDistanceKm;
    private BigDecimal safetyBufferKm;
    private BigDecimal totalPlannedDistanceKm;

    private Long vehicleId;
    private String vehicleName;
    private String numberPlate;
    private FuelType fuelType;
    private BigDecimal mileageKmPerLiter;
    private BigDecimal currentFuelLiter;
    private BigDecimal currentEstimatedRangeKm;

    private BigDecimal requiredFuelLiter;
    private BigDecimal shortageFuelLiter;
    private Boolean canCompleteTrip;

    private String decision;
    private String message;

    private List<RoutePumpSuggestionResponse> suggestedPumps;
}