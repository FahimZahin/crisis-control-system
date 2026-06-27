package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "pump_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_pump_profiles_business_license", columnNames = "business_license_number"),
                @UniqueConstraint(name = "uk_pump_profiles_user_id", columnNames = "user_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PumpProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "pump_name", nullable = false)
    private String pumpName;

    @Column(name = "business_license_number", nullable = false)
    private String businessLicenseNumber;

    @Column(name = "pump_address", nullable = false)
    private String pumpAddress;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "fuel_capacity", nullable = false, precision = 12, scale = 2)
    private BigDecimal fuelCapacity;

    @Column(name = "current_stock", nullable = false, precision = 12, scale = 2)
    private BigDecimal currentStock;

    @Column(name = "fuel_types", nullable = false)
    private String fuelTypes;

    @Column(name = "open_24_hours")
    private Boolean open24Hours;

    @Column(name = "opening_time")
    private String openingTime;

    @Column(name = "closing_time")
    private String closingTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "pump_status", nullable = false)
    private PumpStatus pumpStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.pumpStatus == null) {
            this.pumpStatus = PumpStatus.OPEN;
        }

        if (this.open24Hours == null) {
            this.open24Hours = false;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}