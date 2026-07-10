package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
public class PublicPumpFuelStockResponse {

    private FuelType fuelType;

    private BigDecimal fuelCapacity;
    private BigDecimal currentStock;

    /*
     * Fuel reserved by ACTIVE route fuel tokens.
     * This fuel is physically still inside pump stock, but not publicly usable.
     */
    private BigDecimal routeReservedStock;

    /*
     * Usable stock = currentStock - active route token reserved stock.
     */
    private BigDecimal usableStock;

    /*
     * Empty space = fuelCapacity - currentStock.
     */
    private BigDecimal emptySpace;

    private BigDecimal stockPercentage;
    private Boolean lowStock;
}