package com.crisiscontrol.dto;

import com.crisiscontrol.entity.PumpStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
public class PublicPumpTransparencyResponse {

    private Long pumpId;

    private String pumpName;
    private String pumpAddress;
    private String pumpThana;

    private String ownerName;
    private String phoneNumber;

    private String fuelTypes;

    private PumpStatus pumpStatus;
    private String displayStatus;

    private Boolean open24Hours;
    private String openingTime;
    private String closingTime;

    private BigDecimal totalCapacity;
    private BigDecimal totalCurrentStock;
    private BigDecimal totalRouteReservedStock;
    private BigDecimal totalUsableStock;
    private BigDecimal totalEmptySpace;

    private Boolean lowStock;

    private BigDecimal todayNormalFuelSold;
    private BigDecimal todayRouteTokenFuelSold;
    private BigDecimal todayTotalFuelSold;

    private BigDecimal todayCashCollection;
    private BigDecimal todayBkashCollection;
    private BigDecimal todayTotalCollection;

    private Integer todayNormalCollections;
    private Integer todayRouteTokenCollections;
    private Integer todayTotalCollections;

    private List<PublicPumpFuelStockResponse> fuelStocks;
}