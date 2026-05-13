package com.crisiscontrol.repository;

import com.crisiscontrol.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {

    List<Vehicle> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByNumberPlate(String numberPlate);

    boolean existsByNumberPlateAndIdNot(String numberPlate, Long id);
}