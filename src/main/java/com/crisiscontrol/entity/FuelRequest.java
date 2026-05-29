package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "fuel_requests",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_fuel_requests_collection_code", columnNames = "collection_code")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FuelRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @ManyToOne
    @JoinColumn(name = "emergency_profile_id")
    private EmergencyVehicleProfile emergencyVehicleProfile;

    @ManyToOne
    @JoinColumn(name = "pump_id")
    private PumpProfile pumpProfile;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_source", nullable = false)
    private FuelRequestSource requestSource;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Column(name = "requested_liter", nullable = false, precision = 10, scale = 2)
    private BigDecimal requestedLiter;

    @Column(name = "requested_amount_bdt", precision = 12, scale = 2)
    private BigDecimal requestedAmountBdt;

    @Column(name = "extra_fuel_requested")
    private Boolean extraFuelRequested;

    @Column(name = "extra_fuel_reason_type")
    private String extraFuelReasonType;

    @Column(name = "extra_fuel_demand_message", length = 1500)
    private String extraFuelDemandMessage;

    @Column(name = "fuel_level_status", nullable = false)
    private String fuelLevelStatus;

    @Column(name = "previous_odometer_reading", precision = 12, scale = 2)
    private BigDecimal previousOdometerReading;

    @Column(name = "request_odometer_reading", precision = 12, scale = 2)
    private BigDecimal requestOdometerReading;

    @Column(name = "collection_odometer_reading", precision = 12, scale = 2)
    private BigDecimal collectionOdometerReading;

    @Column(name = "distance_travelled", precision = 12, scale = 2)
    private BigDecimal distanceTravelled;

    @Column(name = "full_tank_range_km", precision = 12, scale = 2)
    private BigDecimal fullTankRangeKm;

    @Column(name = "estimated_remaining_range_km", precision = 12, scale = 2)
    private BigDecimal estimatedRemainingRangeKm;

    @Column(name = "odometer_eligible")
    private Boolean odometerEligible;

    @Column(name = "emergency_reason", length = 1000)
    private String emergencyReason;

    @Column(name = "hospital_name")
    private String hospitalName;

    @Column(name = "hospital_registration_number")
    private String hospitalRegistrationNumber;

    @Column(name = "hospital_address")
    private String hospitalAddress;

    @Column(name = "affected_thana")
    private String affectedThana;

    @Column(name = "generator_capacity")
    private String generatorCapacity;

    @Column(name = "hospital_urgency_level")
    private String hospitalUrgencyLevel;

    @Column(name = "hospital_reason", length = 1000)
    private String hospitalReason;

    @Column(name = "hospital_contact_number")
    private String hospitalContactNumber;

    @Column(name = "hospital_total_icu_units")
    private Integer hospitalTotalIcuUnits;

    @Column(name = "hospital_ac_patient_capacity")
    private Integer hospitalAcPatientCapacity;

    @Column(name = "hospital_non_ac_patient_capacity")
    private Integer hospitalNonAcPatientCapacity;

    @Column(name = "hospital_priority_level")
    private String hospitalPriorityLevel;

    @Column(name = "price_per_unit", nullable = false, precision = 10, scale = 2)
    private BigDecimal pricePerUnit;

    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "collection_code")
    private String collectionCode;

    @Column(name = "admin_note", length = 1000)
    private String adminNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_status", nullable = false)
    private FuelRequestStatus requestStatus;

    @Column(name = "collected_at")
    private LocalDateTime collectedAt;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "cash_amount_bdt", precision = 12, scale = 2)
    private BigDecimal cashAmountBdt;

    @Column(name = "bkash_transaction_id")
    private String bkashTransactionId;

    @Column(name = "paid_amount_bdt", precision = 12, scale = 2)
    private BigDecimal paidAmountBdt;

    @Column(name = "payment_recorded_at")
    private LocalDateTime paymentRecordedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "building_name")
    private String buildingName;

    @Column(name = "building_holding_number")
    private String buildingHoldingNumber;

    @Column(name = "building_address")
    private String buildingAddress;

    @Column(name = "building_thana")
    private String buildingThana;

    @Column(name = "building_generator_power")
    private String buildingGeneratorPower;

    @Column(name = "building_number_of_flats")
    private Integer buildingNumberOfFlats;

    @Column(name = "building_reason", length = 1000)
    private String buildingReason;

    @Column(name = "building_contact_number")
    private String buildingContactNumber;

    @Column(name = "building_diesel_tank_capacity", precision = 12, scale = 2)
    private BigDecimal buildingDieselTankCapacity;

    @Column(name = "building_weekly_allocation_liter", precision = 12, scale = 2)
    private BigDecimal buildingWeeklyAllocationLiter;

    @Column(name = "building_current_fuel", precision = 12, scale = 2)
    private BigDecimal buildingCurrentFuel;

    @Column(name = "building_estimated_backup_hours", precision = 12, scale = 2)
    private BigDecimal buildingEstimatedBackupHours;

    @Column(name = "building_low_stock_alert")
    private Boolean buildingLowStockAlert;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.requestStatus == null) {
            this.requestStatus = FuelRequestStatus.PENDING;
        }

        if (this.requestSource == null) {
            this.requestSource = FuelRequestSource.VEHICLE_OWNER;
        }

        if (this.fuelLevelStatus == null || this.fuelLevelStatus.isBlank()) {
            this.fuelLevelStatus = "UNKNOWN";
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}