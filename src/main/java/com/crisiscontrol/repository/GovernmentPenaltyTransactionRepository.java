package com.crisiscontrol.repository;

import com.crisiscontrol.entity.GovernmentPenaltyTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GovernmentPenaltyTransactionRepository extends JpaRepository<GovernmentPenaltyTransaction, Long> {

    List<GovernmentPenaltyTransaction> findByLedgerIdOrderByCreatedAtDesc(Long ledgerId);

    List<GovernmentPenaltyTransaction> findByPumpProfileIdOrderByCreatedAtDesc(Long pumpProfileId);

    List<GovernmentPenaltyTransaction> findAllByOrderByCreatedAtDesc();
}