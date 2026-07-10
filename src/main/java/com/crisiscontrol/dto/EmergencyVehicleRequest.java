package com.crisiscontrol.dto;

import com.crisiscontrol.entity.EmergencyVehicleType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EmergencyVehicleRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Authority name is required")
    private String authorityName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "Organization name is required")
    private String organizationName;

    @NotNull(message = "Emergency vehicle type is required")
    private EmergencyVehicleType emergencyVehicleType;

    @NotBlank(message = "Vehicle number is required")
    private String vehicleNumber;

    @NotBlank(message = "Driver name is required")
    private String driverName;

    @NotBlank(message = "Driver license number is required")
    private String driverLicenseNumber;

    @NotBlank(message = "Assigned area is required")
    private String assignedArea;

    @NotBlank(message = "Verification ID is required")
    private String verificationId;

    @NotBlank(message = "Reason or purpose is required")
    private String reason;
}