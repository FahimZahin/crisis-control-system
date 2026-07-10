package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class EnforcementRuleResponse {

    private Long id;

    private String violationCode;

    private String violationTitle;

    private String complaintType;

    private String description;

    private String requiredEvidence;

    private String localVerificationRule;

    private String allowedAdminAction;

    private BigDecimal penaltyAmount;

    private Integer temporaryDeactivationDays;

    private String repeatOffenseRule;

    private String appealOption;

    private Boolean publicVisible;

    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}