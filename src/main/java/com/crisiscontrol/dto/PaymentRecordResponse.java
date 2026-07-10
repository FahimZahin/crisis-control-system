package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PaymentPurpose;
import com.crisiscontrol.entity.PaymentRecordStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PaymentRecordResponse {

    private Long id;

    private Long userId;
    private String userName;
    private String userPhone;

    private Long pumpId;
    private String pumpName;
    private String pumpAddress;

    private Long fuelRequestId;
    private Long routeFuelTokenId;
    private String routeTokenCode;
    private String collectionCode;

    private PaymentPurpose paymentPurpose;
    private String paymentMethod;
    private String bkashTransactionId;

    private BigDecimal cashAmountBdt;
    private BigDecimal bkashAmountBdt;
    private BigDecimal paidAmountBdt;
    private BigDecimal governmentRecoveryAmountBdt;
    private BigDecimal pumpKeptAmountBdt;

    private String description;
    private PaymentRecordStatus status;

    private LocalDateTime recordedAt;
    private LocalDateTime createdAt;
}