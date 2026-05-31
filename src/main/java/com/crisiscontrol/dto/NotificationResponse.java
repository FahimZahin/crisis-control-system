package com.crisiscontrol.dto;

import com.crisiscontrol.entity.NotificationType;
import com.crisiscontrol.entity.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class NotificationResponse {

    private Long id;

    private Long userId;
    private String userName;
    private Role role;

    private NotificationType notificationType;

    private String title;
    private String message;

    private String relatedEntityType;
    private Long relatedEntityId;

    private String targetPage;

    private Boolean readStatus;

    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}