package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class FuelRequestCreateRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Vehicle ID is required")
    private Long vehicleId;

    @NotNull(message = "Fuel type is required")
    private FuelType fuelType;

    @NotNull(message = "Requested liter is required")
    @DecimalMin(value = "0.1", message = "Requested liter must be greater than 0")
    private BigDecimal requestedLiter;

    private BigDecimal requestedAmountBdt;

    private String extraFuelReasonType;

    private String extraFuelDemandMessage;

    @NotBlank(message = "Fuel level status is required")
    private String fuelLevelStatus;

    @NotNull(message = "Current odometer reading is required")
    @DecimalMin(value = "0.0", message = "Current odometer reading cannot be negative")
    private BigDecimal currentOdometerReading;
}