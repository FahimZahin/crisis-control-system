package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ChatSendRequest {

    private Long senderId;
    private Long receiverId;
    private String message;
}