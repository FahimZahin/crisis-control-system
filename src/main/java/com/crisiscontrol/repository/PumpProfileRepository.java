package com.crisiscontrol.repository;

import com.crisiscontrol.entity.PumpProfile;
import com.crisiscontrol.entity.PumpStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PumpProfileRepository extends JpaRepository<PumpProfile, Long> {

    Optional<PumpProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByBusinessLicenseNumber(String businessLicenseNumber);

    List<PumpProfile> findByPumpStatusOrderByUpdatedAtDesc(PumpStatus pumpStatus);

    List<PumpProfile> findAllByOrderByUpdatedAtDesc();
}