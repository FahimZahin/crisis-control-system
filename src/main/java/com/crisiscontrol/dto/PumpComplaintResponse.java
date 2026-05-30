package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PumpComplaintStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PumpComplaintResponse {

    private Long id;

    private Long complainantUserId;
    private String complainantName;
    private String complainantPhone;

    private Long pumpProfileId;
    private String pumpName;
    private String pumpOwnerName;
    private String pumpPhone;
    private String pumpAddress;
    private String pumpThana;

    private String complaintType;
    private String complaintTitle;
    private String complaintDescription;
    private String evidenceNote;

    private PumpComplaintStatus status;

    private String localAuthorityNote;
    private String adminNote;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}