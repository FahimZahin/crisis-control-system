package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommunityMessageRequest {

    private Long senderId;
    private String message;
}