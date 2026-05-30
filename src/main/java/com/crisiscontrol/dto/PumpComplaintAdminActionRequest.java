package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PumpComplaintAdminActionRequest {

    private Long adminUserId;

    // APPLY_RULE_ACTION / DISMISS
    private String decision;

    private String adminNote;
}