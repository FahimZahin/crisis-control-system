package com.crisiscontrol.dto;

import com.crisiscontrol.entity.ChatMessageStatus;
import com.crisiscontrol.entity.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ChatMessageResponse {

    private Long id;

    private Long senderId;
    private String senderName;
    private Role senderRole;

    private Long receiverId;
    private String receiverName;
    private Role receiverRole;

    private String message;
    private ChatMessageStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}