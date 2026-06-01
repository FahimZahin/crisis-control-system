package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payment_records",
        indexes = {
                @Index(name = "idx_payment_records_user_id", columnList = "user_id"),
                @Index(name = "idx_payment_records_pump_id", columnList = "pump_id"),
                @Index(name = "idx_payment_records_purpose", columnList = "payment_purpose"),
                @Index(name = "idx_payment_records_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * The user who paid.
     * For normal vehicle fuel = vehicle owner.
     * For route fuel token = vehicle owner.
     */
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    /*
     * Pump receiving/processing the payment.
     */
    @ManyToOne
    @JoinColumn(name = "pump_id")
    private PumpProfile pumpProfile;

    /*
     * Optional link to normal fuel request.
     */
    @ManyToOne
    @JoinColumn(name = "fuel_request_id")
    private FuelRequest fuelRequest;

    /*
     * Optional link to route fuel token.
     */
    @ManyToOne
    @JoinColumn(name = "route_fuel_token_id")
    private RouteFuelToken routeFuelToken;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_purpose", nullable = false)
    private PaymentPurpose paymentPurpose;

    @Column(name = "payment_method", nullable = false)
    private String paymentMethod;

    @Column(name = "bkash_transaction_id")
    private String bkashTransactionId;

    @Column(name = "cash_amount_bdt", precision = 12, scale = 2)
    private BigDecimal cashAmountBdt;

    @Column(name = "bkash_amount_bdt", precision = 12, scale = 2)
    private BigDecimal bkashAmountBdt;

    @Column(name = "paid_amount_bdt", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmountBdt;

    /*
     * If pump is OPEN_WITH_DEBT, some collection may go to government first.
     */
    @Column(name = "government_recovery_amount_bdt", precision = 12, scale = 2)
    private BigDecimal governmentRecoveryAmountBdt;

    @Column(name = "pump_kept_amount_bdt", precision = 12, scale = 2)
    private BigDecimal pumpKeptAmountBdt;

    @Column(name = "description", length = 1000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PaymentRecordStatus status;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();

        if (this.recordedAt == null) {
            this.recordedAt = LocalDateTime.now();
        }

        if (this.status == null) {
            this.status = PaymentRecordStatus.RECORDED;
        }

        if (this.cashAmountBdt == null) {
            this.cashAmountBdt = BigDecimal.ZERO;
        }

        if (this.bkashAmountBdt == null) {
            this.bkashAmountBdt = BigDecimal.ZERO;
        }

        if (this.governmentRecoveryAmountBdt == null) {
            this.governmentRecoveryAmountBdt = BigDecimal.ZERO;
        }

        if (this.pumpKeptAmountBdt == null) {
            this.pumpKeptAmountBdt = BigDecimal.ZERO;
        }
    }
}