package com.crisiscontrol.dto;

import com.crisiscontrol.entity.ActivationRequestStatus;
import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ActivationRequestResponse {

    private Long requestId;
    private String reason;
    private ActivationRequestStatus requestStatus;
    private LocalDateTime requestedAt;
    private LocalDateTime reviewedAt;

    private Long userId;
    private String fullName;
    private String phoneNumber;
    private Role role;
    private UserStatus userStatus;
}