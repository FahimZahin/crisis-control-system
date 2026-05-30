package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "enforcement_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnforcementRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "violation_code", nullable = false, unique = true)
    private String violationCode;

    @Column(name = "violation_title", nullable = false)
    private String violationTitle;

    @Column(name = "complaint_type", nullable = false)
    private String complaintType;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "required_evidence", nullable = false, columnDefinition = "TEXT")
    private String requiredEvidence;

    @Column(name = "local_verification_rule", nullable = false, columnDefinition = "TEXT")
    private String localVerificationRule;

    @Column(name = "allowed_admin_action", nullable = false)
    private String allowedAdminAction;

    @Column(name = "penalty_amount", precision = 12, scale = 2)
    private BigDecimal penaltyAmount;

    @Column(name = "temporary_deactivation_days")
    private Integer temporaryDeactivationDays;

    @Column(name = "repeat_offense_rule", columnDefinition = "TEXT")
    private String repeatOffenseRule;

    @Column(name = "appeal_option", columnDefinition = "TEXT")
    private String appealOption;

    @Column(name = "public_visible", nullable = false)
    private Boolean publicVisible;

    @Column(name = "active", nullable = false)
    private Boolean active;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.publicVisible == null) {
            this.publicVisible = true;
        }

        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}