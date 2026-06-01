package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProfileUpdateRequest {

    private String fullName;
    private String phoneNumber;
    private String address;
    private String thanaOrUpazila;
}