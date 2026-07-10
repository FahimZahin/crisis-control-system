package com.crisiscontrol.dto;

import com.crisiscontrol.entity.UtilityProvider;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UtilityProfileRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Provider is required")
    private UtilityProvider provider;

    @NotBlank(message = "Officer name is required")
    private String officerName;

    @NotBlank(message = "Employee ID is required")
    private String employeeId;

    @NotBlank(message = "Official phone is required")
    private String officialPhone;

    @NotBlank(message = "Office address is required")
    private String officeAddress;

    @NotBlank(message = "Service zone is required")
    private String serviceZone;
}