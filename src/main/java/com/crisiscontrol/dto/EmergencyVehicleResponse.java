package com.crisiscontrol.dto;

import com.crisiscontrol.entity.EmergencyVehicleApprovalStatus;
import com.crisiscontrol.entity.EmergencyVehicleType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class EmergencyVehicleResponse {

    private Long id;

    private Long userId;
    private String userFullName;
    private String userPhoneNumber;

    private String authorityName;
    private String phoneNumber;
    private String organizationName;
    private EmergencyVehicleType emergencyVehicleType;
    private String vehicleNumber;
    private String driverName;
    private String driverLicenseNumber;
    private String assignedArea;
    private String verificationId;
    private String reason;

    private EmergencyVehicleApprovalStatus approvalStatus;
    private String adminNote;

    private Boolean priorityFuelAccess;

    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;
    private LocalDateTime updatedAt;
}