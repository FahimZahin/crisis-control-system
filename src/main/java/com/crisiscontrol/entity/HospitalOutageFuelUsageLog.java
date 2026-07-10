package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "hospital_outage_fuel_usage_logs",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_hospital_outage_usage",
                        columnNames = {"hospital_user_id", "power_outage_notice_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HospitalOutageFuelUsageLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Hospital Authority user
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_user_id", nullable = false)
    private User hospitalUser;

    // Power outage notice
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "power_outage_notice_id", nullable = false)
    private PowerOutageNotice powerOutageNotice;

    @Column(name = "last_deducted_until", nullable = false)
    private LocalDateTime lastDeductedUntil;

    @Column(name = "total_deducted_liter", nullable = false)
    private Double totalDeductedLiter;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.totalDeductedLiter == null) {
            this.totalDeductedLiter = 0.0;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}