package com.crisiscontrol.dto;

import com.crisiscontrol.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class AuthResponse {

    private String message;
    private Long userId;
    private String fullName;
    private Role role;
}