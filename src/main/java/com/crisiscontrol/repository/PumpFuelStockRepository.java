package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.PumpFuelStock;
import com.crisiscontrol.entity.PumpProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PumpFuelStockRepository extends JpaRepository<PumpFuelStock, Long> {

    List<PumpFuelStock> findByPumpProfileIdOrderByFuelTypeAsc(Long pumpId);

    Optional<PumpFuelStock> findByPumpProfileAndFuelType(PumpProfile pumpProfile, FuelType fuelType);

    void deleteByPumpProfileId(Long pumpId);
}