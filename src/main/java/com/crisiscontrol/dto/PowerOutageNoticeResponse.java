package com.crisiscontrol.dto;

import com.crisiscontrol.entity.CityCorporation;
import com.crisiscontrol.entity.PowerOutageCause;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PowerOutageType;
import com.crisiscontrol.entity.UtilityProvider;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@Builder
public class PowerOutageNoticeResponse {

    private Long id;

    private Long userId;

    private Long utilityProfileId;

    private UtilityProvider provider;

    private CityCorporation cityCorporation;

    private String officerName;

    private String serviceZone;

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

    private LocalDateTime restoredAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}