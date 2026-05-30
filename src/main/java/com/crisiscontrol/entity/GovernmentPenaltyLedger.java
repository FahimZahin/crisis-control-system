package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "government_penalty_ledgers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GovernmentPenaltyLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false)
    @JoinColumn(name = "enforcement_action_id")
    private PumpEnforcementAction enforcementAction;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_complaint_id")
    private PumpComplaint pumpComplaint;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_profile_id")
    private PumpProfile pumpProfile;

    @Column(name = "rule_code", nullable = false)
    private String ruleCode;

    @Column(name = "complaint_type", nullable = false)
    private String complaintType;

    @Column(name = "base_penalty_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal basePenaltyAmount;

    @Column(name = "temporary_deactivation_days", nullable = false)
    private Integer temporaryDeactivationDays;

    @Column(name = "early_operation_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal earlyOperationAmount;

    @Column(name = "total_debt_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal totalDebtAmount;

    @Column(name = "paid_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal paidAmount;

    @Column(name = "outstanding_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal outstandingAmount;

    @Column(name = "pump_negative_balance", precision = 12, scale = 2, nullable = false)
    private BigDecimal pumpNegativeBalance;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private GovernmentPenaltyStatus status;

    @Column(name = "operation_allowed", nullable = false)
    private Boolean operationAllowed;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "operation_started_at")
    private LocalDateTime operationStartedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.paidAmount == null) {
            this.paidAmount = BigDecimal.ZERO;
        }

        if (this.pumpNegativeBalance == null) {
            this.pumpNegativeBalance = BigDecimal.ZERO;
        }

        if (this.operationAllowed == null) {
            this.operationAllowed = false;
        }

        if (this.status == null) {
            this.status = GovernmentPenaltyStatus.PENDING;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}