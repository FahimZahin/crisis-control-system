package com.crisiscontrol.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class HospitalGeneratorFuelRequestCreateRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Affected thana is required")
    private String affectedThana;

    @NotBlank(message = "Hospital name is required")
    private String hospitalName;

    @NotBlank(message = "Generator capacity is required")
    private String generatorCapacity;

    @NotNull(message = "Required diesel liter is required")
    @DecimalMin(value = "1.00", message = "Required diesel liter must be at least 1")
    private BigDecimal requiredDieselLiter;

    @NotBlank(message = "Urgency level is required")
    private String urgencyLevel;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Contact number is required")
    private String contactNumber;
}