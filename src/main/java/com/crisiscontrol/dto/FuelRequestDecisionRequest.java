package com.crisiscontrol.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FuelRequestDecisionRequest {

    @NotNull(message = "Pump ID is required for approval")
    private Long pumpId;

    private String adminNote;
}