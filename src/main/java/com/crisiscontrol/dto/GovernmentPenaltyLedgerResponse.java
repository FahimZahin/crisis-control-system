package com.crisiscontrol.dto;

import com.crisiscontrol.entity.GovernmentPenaltyStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class GovernmentPenaltyLedgerResponse {

    private Long id;

    private Long enforcementActionId;
    private Long complaintId;
    private Long pumpProfileId;

    private String pumpName;
    private String pumpAddress;
    private String ruleCode;
    private String complaintType;

    private BigDecimal basePenaltyAmount;
    private Integer temporaryDeactivationDays;
    private BigDecimal earlyOperationAmount;

    private BigDecimal totalDebtAmount;
    private BigDecimal paidAmount;
    private BigDecimal outstandingAmount;
    private BigDecimal pumpNegativeBalance;

    private GovernmentPenaltyStatus status;
    private Boolean operationAllowed;

    private LocalDateTime createdAt;
    private LocalDateTime operationStartedAt;
    private LocalDateTime paidAt;
}