package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "pump_complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PumpComplaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "complainant_user_id")
    private User complainant;

    @ManyToOne(optional = false)
    @JoinColumn(name = "pump_profile_id")
    private PumpProfile pumpProfile;

    @Column(name = "complaint_type", nullable = false)
    private String complaintType;

    @Column(name = "complaint_title", nullable = false)
    private String complaintTitle;

    @Column(name = "complaint_description", nullable = false, columnDefinition = "TEXT")
    private String complaintDescription;

    @Column(name = "evidence_note", columnDefinition = "TEXT")
    private String evidenceNote;

    @Column(name = "pump_thana")
    private String pumpThana;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PumpComplaintStatus status;

    @Column(name = "local_authority_note", columnDefinition = "TEXT")
    private String localAuthorityNote;

    @Column(name = "admin_note", columnDefinition = "TEXT")
    private String adminNote;

    @ManyToOne
    @JoinColumn(name = "verified_by_local_authority_id")
    private User verifiedByLocalAuthority;

    @Column(name = "local_verification_decision")
    private String localVerificationDecision;

    @Column(name = "local_recommendation", columnDefinition = "TEXT")
    private String localRecommendation;

    @Column(name = "local_verified_at")
    private LocalDateTime localVerifiedAt;

    @Column(name = "admin_action_decision")
    private String adminActionDecision;

    @Column(name = "admin_action_note", columnDefinition = "TEXT")
    private String adminActionNote;

    @Column(name = "admin_action_at")
    private LocalDateTime adminActionAt;

    @Column(name = "applied_rule_code")
    private String appliedRuleCode;

    @Column(name = "applied_admin_action")
    private String appliedAdminAction;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.status == null) {
            this.status = PumpComplaintStatus.PENDING_LOCAL_VERIFICATION;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}