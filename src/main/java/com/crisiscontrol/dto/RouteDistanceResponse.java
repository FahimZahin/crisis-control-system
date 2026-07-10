package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class RouteDistanceResponse {

    private String sourceDistrict;
    private String destinationDistrict;
    private BigDecimal straightDistanceKm;
    private BigDecimal estimatedRoadDistanceKm;
    private String calculationType;
    private String note;
}