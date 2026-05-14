package com.crisiscontrol.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PumpStockUpdateRequest {

    @NotEmpty(message = "At least one fuel stock is required")
    @Valid
    private List<PumpFuelStockRequest> fuelStocks;

    @NotNull(message = "24 hours status is required")
    private Boolean open24Hours;

    private String openingTime;

    private String closingTime;
}