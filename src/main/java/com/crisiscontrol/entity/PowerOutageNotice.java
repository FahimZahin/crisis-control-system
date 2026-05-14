package com.crisiscontrol.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "power_outage_notices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PowerOutageNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "utility_profile_id", nullable = false)
    private UtilityProfile utilityProfile;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private UtilityProvider provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "city_corporation", nullable = false)
    private CityCorporation cityCorporation;

    @Column(name = "thana_name", nullable = false)
    private String thanaName;

    @Enumerated(EnumType.STRING)
    @Column(name = "outage_type", nullable = false)
    private PowerOutageType outageType;

    @Enumerated(EnumType.STRING)
    @Column(name = "cause", nullable = false)
    private PowerOutageCause cause;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PowerOutageStatus status;

    @Column(name = "start_date_time")
    private LocalDateTime startDateTime;

    @Column(name = "expected_restoration_date_time")
    private LocalDateTime expectedRestorationDateTime;

    @Column(name = "daily_start_time")
    private LocalTime dailyStartTime;

    @Column(name = "daily_end_time")
    private LocalTime dailyEndTime;

    @Column(name = "emergency_message", nullable = false, length = 1000)
    private String emergencyMessage;

    @Column(name = "contact_number", nullable = false)
    private String contactNumber;

    @Column(name = "warning_acknowledged", nullable = false)
    private Boolean warningAcknowledged;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();

        if (this.warningAcknowledged == null) {
            this.warningAcknowledged = false;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}