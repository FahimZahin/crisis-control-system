package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "government_penalty_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GovernmentPenaltyTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ledger_id")
    private GovernmentPenaltyLedger ledger;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_profile_id")
    private PumpProfile pumpProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false)
    private GovernmentPenaltyTransactionType transactionType;

    @Column(name = "amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "government_credit", precision = 12, scale = 2, nullable = false)
    private BigDecimal governmentCredit;

    @Column(name = "pump_kept_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal pumpKeptAmount;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();

        if (this.governmentCredit == null) {
            this.governmentCredit = BigDecimal.ZERO;
        }

        if (this.pumpKeptAmount == null) {
            this.pumpKeptAmount = BigDecimal.ZERO;
        }
    }
}