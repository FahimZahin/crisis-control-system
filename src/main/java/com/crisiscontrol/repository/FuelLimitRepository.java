package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelLimit;
import com.crisiscontrol.entity.FuelLimitType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FuelLimitRepository extends JpaRepository<FuelLimit, Long> {

    Optional<FuelLimit> findByLimitType(FuelLimitType limitType);
}