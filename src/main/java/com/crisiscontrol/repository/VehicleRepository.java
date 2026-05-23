package com.crisiscontrol.repository;

import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByNumberPlate(String numberPlate);

    boolean existsByNumberPlateAndIdNot(String numberPlate, Long id);

    boolean existsByUserIdAndVehicleType(Long userId, VehicleType vehicleType);

    boolean existsByUserIdAndVehicleTypeAndIdNot(Long userId, VehicleType vehicleType, Long id);
}