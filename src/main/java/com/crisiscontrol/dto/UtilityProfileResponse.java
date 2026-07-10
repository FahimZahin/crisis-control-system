package com.crisiscontrol.dto;

import com.crisiscontrol.entity.CityCorporation;
import com.crisiscontrol.entity.UtilityProvider;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class UtilityProfileResponse {

    private Long id;
    private Long userId;

    private UtilityProvider provider;
    private CityCorporation cityCorporation;

    private String officerName;
    private String employeeId;
    private String officialPhone;
    private String officeAddress;
    private String serviceZone;

    private List<String> allowedThanas;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}