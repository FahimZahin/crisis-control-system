package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PowerOutageCause;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PowerOutageType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
public class PowerOutageNoticeRequest {

    private Long userId;

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
}