package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PowerOutageCause;
import com.crisiscontrol.entity.PowerOutageStatus;
import com.crisiscontrol.entity.PowerOutageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PowerOutageRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotBlank(message = "Thana is required")
    private String thanaName;

    @NotNull(message = "Outage type is required")
    private PowerOutageType outageType;

    @NotNull(message = "Cause is required")
    private PowerOutageCause cause;

    private PowerOutageStatus status;

    private String startDateTime;

    private String expectedRestorationDateTime;

    private String dailyStartTime;

    private String dailyEndTime;

    @NotBlank(message = "Emergency message is required")
    private String emergencyMessage;

    @NotBlank(message = "Contact number is required")
    private String contactNumber;

    private Boolean warningAcknowledged;
}