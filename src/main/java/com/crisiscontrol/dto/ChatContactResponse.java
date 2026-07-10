package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ChatContactResponse {

    private Long userId;
    private String fullName;
    private String phoneNumber;
    private Role role;
    private String address;
    private String thanaOrUpazila;

    private Long unreadCount;
    private String lastMessage;
    private String lastMessageTime;
}