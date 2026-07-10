package com.crisiscontrol.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class FuelPriceRequest {

    @NotNull(message = "Petrol price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Petrol price must be greater than 0")
    private BigDecimal petrolPrice;

    @NotNull(message = "Octane price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Octane price must be greater than 0")
    private BigDecimal octanePrice;

    @NotNull(message = "Diesel price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Diesel price must be greater than 0")
    private BigDecimal dieselPrice;

    @NotNull(message = "CNG price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "CNG price must be greater than 0")
    private BigDecimal cngPrice;
}