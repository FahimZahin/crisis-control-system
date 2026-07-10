package com.crisiscontrol.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PublicPumpTransparencySummaryResponse {

    private Integer totalPumps;
    private Integer openPumps;
    private Integer openWithDebtPumps;
    private Integer closedPumps;
    private Integer penaltyLockedPumps;
    private Integer lowStockPumps;

    private BigDecimal totalCapacity;
    private BigDecimal totalCurrentStock;
    private BigDecimal totalRouteReservedStock;
    private BigDecimal totalUsableStock;
    private BigDecimal totalEmptySpace;

    private BigDecimal todayFuelSold;
    private BigDecimal todayCashCollection;
    private BigDecimal todayBkashCollection;
    private BigDecimal todayTotalCollection;

    private LocalDateTime generatedAt;
}