package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class EnforcementRuleRequest {

    private Long adminUserId;

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
}