package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PumpComplaintVerificationRequest {

    private Long localAuthorityUserId;

    // VERIFIED_TRUE / VERIFIED_FALSE / NEEDS_MORE_EVIDENCE
    private String decision;

    private String localAuthorityNote;

    private String localRecommendation;
}