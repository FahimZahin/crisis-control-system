package com.crisiscontrol.dto;

import com.crisiscontrol.entity.CarCategory;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.VehicleType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class VehicleRequest {

    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Vehicle type is required")
    private VehicleType vehicleType;

    @NotNull(message = "Car category is required")
    private CarCategory carCategory;

    @NotBlank(message = "Brand is required")
    private String brand;

    @NotBlank(message = "Model is required")
    private String model;

    @NotNull(message = "Fuel type is required")
    private FuelType fuelType;

    @NotNull(message = "Engine CC is required")
    @Min(value = 50, message = "Engine CC must be at least 50")
    private Integer engineCc;

    @NotNull(message = "Company mileage is required")
    @DecimalMin(value = "1.0", message = "Company mileage must be greater than 0")
    private BigDecimal companyMileage;

    @NotNull(message = "Tank capacity is required")
    @DecimalMin(value = "1.0", message = "Tank capacity must be greater than 0")
    private BigDecimal tankCapacity;

    @NotNull(message = "Current fuel liter is required")
    @DecimalMin(value = "0.0", message = "Current fuel liter cannot be negative")
    private BigDecimal currentFuelLiter;

    @NotBlank(message = "Number plate is required")
    private String numberPlate;

    @NotNull(message = "Odometer reading is required")
    @DecimalMin(value = "0.0", message = "Odometer reading cannot be negative")
    private BigDecimal odometerReading;

    private String vehiclePhotoPath;
}