package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "pump_enforcement_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PumpEnforcementAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_complaint_id")
    private PumpComplaint pumpComplaint;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_profile_id")
    private PumpProfile pumpProfile;

    @ManyToOne(optional = false)
    @JoinColumn(name = "admin_user_id")
    private User adminUser;

    @Column(name = "rule_code", nullable = false)
    private String ruleCode;

    @Column(name = "complaint_type", nullable = false)
    private String complaintType;

    @Column(name = "violation_title", nullable = false)
    private String violationTitle;

    @Column(name = "admin_action", nullable = false)
    private String adminAction;

    @Column(name = "penalty_amount", precision = 12, scale = 2)
    private BigDecimal penaltyAmount;

    @Column(name = "temporary_deactivation_days")
    private Integer temporaryDeactivationDays;

    @Column(name = "government_penalty_credit", precision = 12, scale = 2)
    private BigDecimal governmentPenaltyCredit;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @Column(name = "action_taken_at", nullable = false)
    private LocalDateTime actionTakenAt;

    @PrePersist
    public void beforeCreate() {
        this.actionTakenAt = LocalDateTime.now();

        if (this.governmentPenaltyCredit == null) {
            this.governmentPenaltyCredit = this.penaltyAmount;
        }
    }
}