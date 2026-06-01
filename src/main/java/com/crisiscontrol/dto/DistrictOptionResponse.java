package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class DistrictOptionResponse {

    private String districtName;
    private String divisionName;
    private Double latitude;
    private Double longitude;
}