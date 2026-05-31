package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "route_fuel_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteFuelToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_code", nullable = false, unique = true)
    private String tokenCode;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_profile_id")
    private PumpProfile pumpProfile;

    @Column(name = "source_city", nullable = false)
    private String sourceCity;

    @Column(name = "destination_city", nullable = false)
    private String destinationCity;

    @Column(name = "stop_city")
    private String stopCity;

    @Column(name = "distance_from_source_km", precision = 10, scale = 2)
    private BigDecimal distanceFromSourceKm;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Column(name = "reserved_liter", precision = 10, scale = 2, nullable = false)
    private BigDecimal reservedLiter;

    @Column(name = "estimated_cost", precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "current_odometer_at_planning", precision = 12, scale = 2)
    private BigDecimal currentOdometerAtPlanning;

    @Column(name = "expected_odometer_at_stop", precision = 12, scale = 2)
    private BigDecimal expectedOdometerAtStop;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RouteFuelTokenStatus status;

    @Column(name = "valid_until", nullable = false)
    private LocalDateTime validUntil;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "bkash_transaction_id")
    private String bkashTransactionId;

    @Column(name = "paid_amount_bdt", precision = 12, scale = 2)
    private BigDecimal paidAmountBdt;

    @Column(name = "actual_odometer_at_collection", precision = 12, scale = 2)
    private BigDecimal actualOdometerAtCollection;

    @Column(name = "verified_number_plate")
    private String verifiedNumberPlate;

    @Column(name = "collection_note", columnDefinition = "TEXT")
    private String collectionNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = RouteFuelTokenStatus.ACTIVE;
        }
    }
}