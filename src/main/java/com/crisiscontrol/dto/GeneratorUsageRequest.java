package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GeneratorUsageRequest {

    private Long userId;

    private Double usedHours;

    private String usageReasonType;

    private String customReason;
}