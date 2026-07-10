package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class CrisisAssistantResponse {

    private String intent;
    private String answer;
    private String userArea;
    private List<String> suggestedQuestions;
    private LocalDateTime answeredAt;
}