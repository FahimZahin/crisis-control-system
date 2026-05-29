package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class FuelSettingsResponse {

    private BigDecimal petrolPrice;
    private BigDecimal octanePrice;
    private BigDecimal dieselPrice;
    private BigDecimal cngPrice;

    private BigDecimal bikeLimit;
    private BigDecimal carLimit;
    private BigDecimal emergencyVehicleLimit;
    private BigDecimal generatorDieselLimit;

    private BigDecimal buildingGeneratorWeeklyDieselAllocation;
    private BigDecimal hospitalGeneratorWeeklyDieselAllocation;

    private LocalDateTime lastUpdatedAt;
}