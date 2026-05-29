package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class GeneratorUsageResponse {

    private Long id;

    private Long userId;

    private Long powerOutageNoticeId;

    private String authorityType;

    private String organizationName;

    private String outageThana;

    private LocalDateTime outageStartTime;

    private LocalDateTime outageEndTime;

    private Double usedHours;

    private Double generatorCapacity;

    private Double dieselBeforeUsage;

    private Double hourlyDieselConsumption;

    private Double dieselDeducted;

    private Double dieselAfterUsage;

    private Double estimatedBackupAfterUsage;

    private String finalReason;

    private LocalDateTime createdAt;
}