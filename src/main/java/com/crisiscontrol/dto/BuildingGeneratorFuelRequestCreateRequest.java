package com.crisiscontrol.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class BuildingGeneratorFuelRequestCreateRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Building name is required")
    private String buildingName;

    @NotBlank(message = "Generator power is required")
    private String buildingGeneratorPower;

    @NotNull(message = "Required diesel liter is required")
    @DecimalMin(value = "1.00", message = "Required diesel liter must be at least 1")
    private BigDecimal requiredDieselLiter;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Contact number is required")
    private String contactNumber;
}