package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelPrice;
import com.crisiscontrol.entity.FuelType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FuelPriceRepository extends JpaRepository<FuelPrice, Long> {

    Optional<FuelPrice> findByFuelType(FuelType fuelType);
}