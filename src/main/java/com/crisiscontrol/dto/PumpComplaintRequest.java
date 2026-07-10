package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PumpComplaintRequest {

    private Long complainantUserId;

    private Long pumpProfileId;

    private String complaintType;

    private String complaintTitle;

    private String complaintDescription;

    private String evidenceNote;
}