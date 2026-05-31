package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class RouteFuelTokenCollectRequest {

    private Long pumpUserId;
    private String tokenCode;

    private String verifiedNumberPlate;
    private BigDecimal actualOdometerAtCollection;

    private String paymentMethod;
    private String bkashTransactionId;
}