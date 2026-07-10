package com.crisiscontrol.repository;

import com.crisiscontrol.entity.GovernmentPenaltyLedger;
import com.crisiscontrol.entity.GovernmentPenaltyStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface GovernmentPenaltyLedgerRepository extends JpaRepository<GovernmentPenaltyLedger, Long> {

    boolean existsByEnforcementActionId(Long enforcementActionId);

    Optional<GovernmentPenaltyLedger> findByEnforcementActionId(Long enforcementActionId);

    List<GovernmentPenaltyLedger> findAllByOrderByCreatedAtDesc();

    List<GovernmentPenaltyLedger> findByPumpProfileIdOrderByCreatedAtDesc(Long pumpProfileId);

    List<GovernmentPenaltyLedger> findByStatusOrderByCreatedAtDesc(GovernmentPenaltyStatus status);
}