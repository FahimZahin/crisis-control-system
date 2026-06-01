package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentSummaryResponse {

    private BigDecimal totalCash;
    private BigDecimal totalBkash;
    private BigDecimal totalPaid;
    private BigDecimal totalGovernmentRecovery;
    private BigDecimal totalPumpKept;

    private Integer totalRecords;
    private Integer normalFuelPaymentRecords;
    private Integer routeTokenPaymentRecords;
    private Integer penaltyRecoveryRecords;

    private LocalDateTime generatedAt;
}