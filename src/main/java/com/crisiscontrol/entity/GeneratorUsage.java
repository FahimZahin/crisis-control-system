package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "generator_usages",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_generator_usage_outage_user",
                        columnNames = {"power_outage_notice_id", "user_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeneratorUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "power_outage_notice_id")
    private PowerOutageNotice powerOutageNotice;

    @Column(name = "authority_type", nullable = false)
    private String authorityType;

    @Column(name = "organization_name")
    private String organizationName;

    @Column(name = "outage_thana")
    private String outageThana;

    @Column(name = "outage_start_time")
    private LocalDateTime outageStartTime;

    @Column(name = "outage_end_time")
    private LocalDateTime outageEndTime;

    @Column(name = "used_hours", nullable = false)
    private Double usedHours;

    @Column(name = "generator_capacity")
    private Double generatorCapacity;

    @Column(name = "diesel_before_usage", nullable = false)
    private Double dieselBeforeUsage;

    @Column(name = "hourly_diesel_consumption", nullable = false)
    private Double hourlyDieselConsumption;

    @Column(name = "diesel_deducted", nullable = false)
    private Double dieselDeducted;

    @Column(name = "diesel_after_usage", nullable = false)
    private Double dieselAfterUsage;

    @Column(name = "estimated_backup_after_usage")
    private Double estimatedBackupAfterUsage;

    @Column(name = "final_reason", columnDefinition = "TEXT")
    private String finalReason;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
    }
}