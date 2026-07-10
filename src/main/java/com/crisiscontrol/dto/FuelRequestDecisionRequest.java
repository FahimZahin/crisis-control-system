package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FuelRequestDecisionRequest {

    private Long pumpId;

    private String adminNote;
}