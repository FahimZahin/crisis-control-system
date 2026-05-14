package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PumpStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PumpStatusUpdateRequest {

    @NotNull(message = "Pump status is required")
    private PumpStatus pumpStatus;
}