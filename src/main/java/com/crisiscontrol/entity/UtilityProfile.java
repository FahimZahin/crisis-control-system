package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "utility_profiles",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_utility_profile_user", columnNames = "user_id"),
                @UniqueConstraint(name = "uk_utility_employee_id", columnNames = "employee_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilityProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private UtilityProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "city_corporation", nullable = false)
    private CityCorporation cityCorporation;

    @Column(name = "officer_name", nullable = false)
    private String officerName;

    @Column(name = "employee_id", nullable = false)
    private String employeeId;

    @Column(name = "official_phone", nullable = false)
    private String officialPhone;

    @Column(name = "office_address", nullable = false)
    private String officeAddress;

    @Column(name = "service_zone", nullable = false)
    private String serviceZone;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}