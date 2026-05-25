package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_phone_number", columnNames = "phone_number"),
                @UniqueConstraint(name = "uk_users_driving_license_number", columnNames = "driving_license_number"),
                @UniqueConstraint(name = "uk_users_holding_number", columnNames = "holding_number"),
                @UniqueConstraint(name = "uk_users_business_license_number", columnNames = "business_license_number"),
                @UniqueConstraint(name = "uk_users_hospital_registration_number", columnNames = "hospital_registration_number"),
                @UniqueConstraint(name = "uk_users_utility_employee_id", columnNames = "utility_employee_id"),
                @UniqueConstraint(name = "uk_users_official_verification_id", columnNames = "official_verification_id"),
                @UniqueConstraint(name = "uk_users_government_employee_id", columnNames = "government_employee_id"),
                @UniqueConstraint(name = "uk_users_local_authority_id", columnNames = "local_authority_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Common fields
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "phone_number", nullable = false, unique = true)
    private String phoneNumber;

    @Column(name = "address")
    private String address;

    @Column(name = "password", nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UserStatus status;

    // Vehicle owner field
    @Column(name = "driving_license_number", unique = true)
    private String drivingLicenseNumber;

    // Building manager fields
    @Column(name = "building_name")
    private String buildingName;

    @Column(name = "holding_number", unique = true)
    private String holdingNumber;

    @Column(name = "number_of_flats")
    private Integer numberOfFlats;

    @Column(name = "generator_power")
    private Double generatorPower;

    @Column(name = "building_under_thana")
    private String buildingUnderThana;

    @Column(name = "building_current_fuel")
    private Double buildingCurrentFuel;

    @Column(name = "building_estimated_backup_hours")
    private Double buildingEstimatedBackupHours;

    // Pump authority fields
    @Column(name = "pump_name")
    private String pumpName;

    @Column(name = "business_license_number", unique = true)
    private String businessLicenseNumber;

    @Column(name = "pump_address")
    private String pumpAddress;

    @Column(name = "fuel_capacity")
    private Double fuelCapacity;

    @Column(name = "fuel_types")
    private String fuelTypes;

    @Column(name = "current_stock")
    private Double currentStock;

    @Column(name = "open_24_hours")
    private Boolean open24Hours;

    @Column(name = "opening_time")
    private String openingTime;

    @Column(name = "closing_time")
    private String closingTime;

    // Hospital authority fields
    @Column(name = "hospital_name")
    private String hospitalName;

    @Column(name = "hospital_registration_number", unique = true)
    private String hospitalRegistrationNumber;

    @Column(name = "hospital_address")
    private String hospitalAddress;

    @Column(name = "hospital_under_thana")
    private String hospitalUnderThana;

    @Column(name = "hospital_generator_capacity")
    private Double hospitalGeneratorCapacity;

    @Column(name = "hospital_diesel_tank_capacity")
    private Double hospitalDieselTankCapacity;

    @Column(name = "hospital_current_diesel_reserve")
    private Double hospitalCurrentDieselReserve;

    @Column(name = "hospital_estimated_backup_hours")
    private Double hospitalEstimatedBackupHours;

    @Column(name = "hospital_diesel_status")
    private String hospitalDieselStatus;

    @Column(name = "emergency_contact_number")
    private String emergencyContactNumber;

    @Column(name = "total_icu_units")
    private Integer totalIcuUnits;

    @Column(name = "ac_patient_capacity")
    private Integer acPatientCapacity;

    @Column(name = "non_ac_patient_capacity")
    private Integer nonAcPatientCapacity;

    // Utility authority fields
    @Column(name = "utility_organization_type")
    private String utilityOrganizationType;

    @Column(name = "utility_employee_id", unique = true)
    private String utilityEmployeeId;

    @Column(name = "service_area")
    private String serviceArea;

    @Column(name = "office_address")
    private String officeAddress;

    // Emergency vehicle authority fields
    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "organization_type")
    private String organizationType;

    @Column(name = "official_verification_id", unique = true)
    private String officialVerificationId;

    @Column(name = "assigned_area")
    private String assignedArea;

    // Government authority fields
    @Column(name = "government_employee_id", unique = true)
    private String governmentEmployeeId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "designation")
    private String designation;

    // Local authority fields
    @Column(name = "local_authority_id", unique = true)
    private String localAuthorityId;

    @Column(name = "district")
    private String district;

    @Column(name = "thana_or_upazila")
    private String thanaOrUpazila;

    // Admin field
    @Column(name = "admin_code")
    private String adminCode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = UserStatus.ACTIVE;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}