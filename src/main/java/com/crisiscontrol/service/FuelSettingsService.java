package com.crisiscontrol.service;

import com.crisiscontrol.dto.FuelLimitRequest;
import com.crisiscontrol.dto.FuelPriceRequest;
import com.crisiscontrol.dto.FuelSettingsResponse;
import com.crisiscontrol.entity.FuelLimit;
import com.crisiscontrol.entity.FuelLimitType;
import com.crisiscontrol.entity.FuelPrice;
import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.repository.FuelLimitRepository;
import com.crisiscontrol.repository.FuelPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class FuelSettingsService {

    private final FuelPriceRepository fuelPriceRepository;
    private final FuelLimitRepository fuelLimitRepository;

    public FuelSettingsResponse getFuelSettings() {
        FuelPrice petrol = getOrCreateFuelPrice(FuelType.PETROL, new BigDecimal("125.00"), "Liter");
        FuelPrice octane = getOrCreateFuelPrice(FuelType.OCTANE, new BigDecimal("130.00"), "Liter");
        FuelPrice diesel = getOrCreateFuelPrice(FuelType.DIESEL, new BigDecimal("110.00"), "Liter");
        FuelPrice cng = getOrCreateFuelPrice(FuelType.CNG, new BigDecimal("43.00"), "Cubic Meter");

        FuelLimit bike = getOrCreateFuelLimit(
                FuelLimitType.BIKE,
                new BigDecimal("500.00"),
                "BDT",
                "Maximum fuel amount for bike per session"
        );

        FuelLimit car = getOrCreateFuelLimit(
                FuelLimitType.CAR,
                new BigDecimal("2000.00"),
                "BDT",
                "Maximum fuel amount for car per session"
        );

        FuelLimit emergencyVehicle = getOrCreateFuelLimit(
                FuelLimitType.EMERGENCY_VEHICLE,
                new BigDecimal("5000.00"),
                "BDT",
                "Maximum fuel amount for emergency vehicle per session"
        );

        FuelLimit generatorDiesel = getOrCreateFuelLimit(
                FuelLimitType.GENERATOR_DIESEL,
                new BigDecimal("10000.00"),
                "BDT",
                "Maximum diesel support amount for generator per request"
        );

        LocalDateTime lastUpdatedAt = findLatestUpdatedAt(
                petrol,
                octane,
                diesel,
                cng,
                bike,
                car,
                emergencyVehicle,
                generatorDiesel
        );

        return FuelSettingsResponse.builder()
                .petrolPrice(petrol.getPricePerUnit())
                .octanePrice(octane.getPricePerUnit())
                .dieselPrice(diesel.getPricePerUnit())
                .cngPrice(cng.getPricePerUnit())
                .bikeLimit(bike.getLimitAmount())
                .carLimit(car.getLimitAmount())
                .emergencyVehicleLimit(emergencyVehicle.getLimitAmount())
                .generatorDieselLimit(generatorDiesel.getLimitAmount())
                .lastUpdatedAt(lastUpdatedAt)
                .build();
    }

    public void updateFuelPrices(FuelPriceRequest request) {
        updateFuelPrice(FuelType.PETROL, request.getPetrolPrice(), "Liter");
        updateFuelPrice(FuelType.OCTANE, request.getOctanePrice(), "Liter");
        updateFuelPrice(FuelType.DIESEL, request.getDieselPrice(), "Liter");
        updateFuelPrice(FuelType.CNG, request.getCngPrice(), "Cubic Meter");
    }

    public void updateFuelLimits(FuelLimitRequest request) {
        updateFuelLimit(
                FuelLimitType.BIKE,
                request.getBikeLimit(),
                "BDT",
                "Maximum fuel amount for bike per session"
        );

        updateFuelLimit(
                FuelLimitType.CAR,
                request.getCarLimit(),
                "BDT",
                "Maximum fuel amount for car per session"
        );

        updateFuelLimit(
                FuelLimitType.EMERGENCY_VEHICLE,
                request.getEmergencyVehicleLimit(),
                "BDT",
                "Maximum fuel amount for emergency vehicle per session"
        );

        updateFuelLimit(
                FuelLimitType.GENERATOR_DIESEL,
                request.getGeneratorDieselLimit(),
                "BDT",
                "Maximum diesel support amount for generator per request"
        );
    }

    private FuelPrice getOrCreateFuelPrice(FuelType fuelType, BigDecimal defaultPrice, String unit) {
        return fuelPriceRepository.findByFuelType(fuelType)
                .orElseGet(() -> fuelPriceRepository.save(
                        FuelPrice.builder()
                                .fuelType(fuelType)
                                .pricePerUnit(defaultPrice)
                                .unit(unit)
                                .build()
                ));
    }

    private FuelLimit getOrCreateFuelLimit(
            FuelLimitType limitType,
            BigDecimal defaultLimit,
            String limitUnit,
            String description
    ) {
        return fuelLimitRepository.findByLimitType(limitType)
                .orElseGet(() -> fuelLimitRepository.save(
                        FuelLimit.builder()
                                .limitType(limitType)
                                .limitAmount(defaultLimit)
                                .limitUnit(limitUnit)
                                .description(description)
                                .build()
                ));
    }

    private void updateFuelPrice(FuelType fuelType, BigDecimal price, String unit) {
        FuelPrice fuelPrice = getOrCreateFuelPrice(fuelType, price, unit);
        fuelPrice.setPricePerUnit(price);
        fuelPrice.setUnit(unit);

        fuelPriceRepository.save(fuelPrice);
    }

    private void updateFuelLimit(
            FuelLimitType limitType,
            BigDecimal limitAmount,
            String limitUnit,
            String description
    ) {
        FuelLimit fuelLimit = getOrCreateFuelLimit(limitType, limitAmount, limitUnit, description);
        fuelLimit.setLimitAmount(limitAmount);
        fuelLimit.setLimitUnit(limitUnit);
        fuelLimit.setDescription(description);

        fuelLimitRepository.save(fuelLimit);
    }

    private LocalDateTime findLatestUpdatedAt(
            FuelPrice petrol,
            FuelPrice octane,
            FuelPrice diesel,
            FuelPrice cng,
            FuelLimit bike,
            FuelLimit car,
            FuelLimit emergencyVehicle,
            FuelLimit generatorDiesel
    ) {
        LocalDateTime latest = null;

        latest = getLatest(latest, petrol.getUpdatedAt());
        latest = getLatest(latest, octane.getUpdatedAt());
        latest = getLatest(latest, diesel.getUpdatedAt());
        latest = getLatest(latest, cng.getUpdatedAt());
        latest = getLatest(latest, bike.getUpdatedAt());
        latest = getLatest(latest, car.getUpdatedAt());
        latest = getLatest(latest, emergencyVehicle.getUpdatedAt());
        latest = getLatest(latest, generatorDiesel.getUpdatedAt());

        return latest;
    }

    private LocalDateTime getLatest(LocalDateTime current, LocalDateTime next) {
        if (next == null) {
            return current;
        }

        if (current == null || next.isAfter(current)) {
            return next;
        }

        return current;
    }
}