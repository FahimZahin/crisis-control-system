package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "emergency_vehicle_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_emergency_vehicle_user", columnNames = "user_id"),
                @UniqueConstraint(name = "uk_emergency_vehicle_number", columnNames = "vehicle_number"),
                @UniqueConstraint(name = "uk_emergency_vehicle_verification", columnNames = "verification_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmergencyVehicleProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "authority_name", nullable = false)
    private String authorityName;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "organization_name", nullable = false)
    private String organizationName;

    @Enumerated(EnumType.STRING)
    @Column(name = "emergency_vehicle_type", nullable = false)
    private EmergencyVehicleType emergencyVehicleType;

    @Column(name = "vehicle_number", nullable = false)
    private String vehicleNumber;

    @Column(name = "driver_name", nullable = false)
    private String driverName;

    @Column(name = "driver_license_number", nullable = false)
    private String driverLicenseNumber;

    @Column(name = "assigned_area", nullable = false)
    private String assignedArea;

    @Column(name = "verification_id", nullable = false)
    private String verificationId;

    @Column(name = "reason", nullable = false, length = 1000)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false)
    private EmergencyVehicleApprovalStatus approvalStatus;

    @Column(name = "admin_note")
    private String adminNote;

    @Column(name = "priority_fuel_access", nullable = false)
    private Boolean priorityFuelAccess;

    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.submittedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.approvalStatus == null) {
            this.approvalStatus = EmergencyVehicleApprovalStatus.PENDING_APPROVAL;
        }

        if (this.priorityFuelAccess == null) {
            this.priorityFuelAccess = false;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}