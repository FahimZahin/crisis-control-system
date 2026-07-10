package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PumpEarlyOperationRequest {

    private Long pumpAuthorityUserId;

    private String note;
}