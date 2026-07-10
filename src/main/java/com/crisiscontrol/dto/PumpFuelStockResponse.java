package com.crisiscontrol.dto;

import com.crisiscontrol.entity.FuelType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class PumpFuelStockResponse {

    private Long id;
    private FuelType fuelType;
    private BigDecimal fuelCapacity;
    private BigDecimal currentStock;
    private BigDecimal availableStock;
    private LocalDateTime updatedAt;
}