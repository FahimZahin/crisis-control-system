package com.crisiscontrol.repository;

import com.crisiscontrol.entity.UtilityProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UtilityProfileRepository extends JpaRepository<UtilityProfile, Long> {

    Optional<UtilityProfile> findByUserId(Long userId);

    boolean existsByEmployeeId(String employeeId);

    boolean existsByEmployeeIdAndIdNot(String employeeId, Long id);
}