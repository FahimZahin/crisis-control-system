package com.crisiscontrol.repository;

import com.crisiscontrol.entity.PumpEnforcementAction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PumpEnforcementActionRepository extends JpaRepository<PumpEnforcementAction, Long> {

    boolean existsByPumpComplaintId(Long pumpComplaintId);

    List<PumpEnforcementAction> findAllByOrderByActionTakenAtDesc();

    List<PumpEnforcementAction> findByPumpProfileIdOrderByActionTakenAtDesc(Long pumpProfileId);
}