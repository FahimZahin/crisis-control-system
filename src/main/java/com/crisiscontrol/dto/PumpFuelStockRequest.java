package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PumpFuelStockRequest {

    @NotNull(message = "Fuel type is required")
    private FuelType fuelType;

    @NotNull(message = "Fuel capacity is required")
    @DecimalMin(value = "1.0", message = "Fuel capacity must be greater than 0")
    private BigDecimal fuelCapacity;

    @NotNull(message = "Current stock is required")
    @DecimalMin(value = "0.0", message = "Current stock cannot be negative")
    private BigDecimal currentStock;
}