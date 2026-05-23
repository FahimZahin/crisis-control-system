package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "vehicles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_vehicles_number_plate", columnNames = "number_plate")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(name = "car_category", nullable = false)
    private CarCategory carCategory;

    @Column(name = "brand", nullable = false)
    private String brand;

    @Column(name = "model", nullable = false)
    private String model;

    @Enumerated(EnumType.STRING)
    @Column(name = "fuel_type", nullable = false)
    private FuelType fuelType;

    @Column(name = "engine_cc", nullable = false)
    private Integer engineCc;

    @Column(name = "company_mileage", nullable = false, precision = 10, scale = 2)
    private BigDecimal companyMileage;

    @Column(name = "tank_capacity", nullable = false, precision = 10, scale = 2)
    private BigDecimal tankCapacity;

    @Column(name = "current_fuel_liter", nullable = false, precision = 10, scale = 2)
    private BigDecimal currentFuelLiter;

    @Column(name = "number_plate", nullable = false)
    private String numberPlate;

    @Column(name = "odometer_reading", nullable = false, precision = 12, scale = 2)
    private BigDecimal odometerReading;

    @Column(name = "vehicle_photo_path")
    private String vehiclePhotoPath;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.vehiclePhotoPath == null || this.vehiclePhotoPath.isBlank()) {
            this.vehiclePhotoPath = "images/default-vehicle.jpg";
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();

        if (this.vehiclePhotoPath == null || this.vehiclePhotoPath.isBlank()) {
            this.vehiclePhotoPath = "images/default-vehicle.jpg";
        }
    }
}