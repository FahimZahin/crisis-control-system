package com.crisiscontrol.dto;

import com.crisiscontrol.entity.*;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
public class PowerOutageResponse {

    private Long id;
    private Long userId;
    private Long utilityProfileId;

    private String officerName;
    private String officialPhone;

    private UtilityProvider provider;
    private CityCorporation cityCorporation;

    private String thanaName;
    private PowerOutageType outageType;
    private PowerOutageCause cause;
    private PowerOutageStatus status;

    private LocalDateTime startDateTime;
    private LocalDateTime expectedRestorationDateTime;

    private LocalTime dailyStartTime;
    private LocalTime dailyEndTime;

    private String emergencyMessage;
    private String contactNumber;

    private Boolean warningAcknowledged;
    private Boolean ongoingInSameThana;
    private Boolean recentOutageInSameThana;

    private LocalDateTime restoredAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}