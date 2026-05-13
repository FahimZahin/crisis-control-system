package com.crisiscontrol.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class FuelLimitRequest {

    @NotNull(message = "Bike limit is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Bike limit must be greater than 0")
    private BigDecimal bikeLimit;

    @NotNull(message = "Car limit is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Car limit must be greater than 0")
    private BigDecimal carLimit;

    @NotNull(message = "Emergency vehicle limit is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Emergency vehicle limit must be greater than 0")
    private BigDecimal emergencyVehicleLimit;

    @NotNull(message = "Generator diesel limit is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Generator diesel limit must be greater than 0")
    private BigDecimal generatorDieselLimit;
}