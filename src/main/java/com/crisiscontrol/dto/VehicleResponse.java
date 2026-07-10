package com.crisiscontrol.dto;

import com.crisiscontrol.entity.CarCategory;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.VehicleType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class VehicleResponse {

    private Long id;

    private Long userId;
    private String ownerName;

    private VehicleType vehicleType;
    private CarCategory carCategory;

    private String brand;
    private String model;

    private FuelType fuelType;

    private Integer engineCc;
    private BigDecimal companyMileage;
    private BigDecimal tankCapacity;
    private BigDecimal currentFuelLiter;
    private String lastFuelPumpName;
    private BigDecimal fuelAfterLastInsertionLiter;

    private String numberPlate;
    private BigDecimal odometerReading;

    private String vehiclePhotoPath;

    private Boolean deleted;
    private LocalDateTime deletedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}