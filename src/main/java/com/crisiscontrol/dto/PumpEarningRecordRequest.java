package com.crisiscontrol.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class PumpEarningRecordRequest {

    private Long pumpAuthorityUserId;

    private BigDecimal earningAmount;

    private String note;
}