package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CrisisAssistantRequest {

    private Long userId;
    private String question;
}