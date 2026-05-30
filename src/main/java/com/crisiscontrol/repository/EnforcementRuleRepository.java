package com.crisiscontrol.repository;

import com.crisiscontrol.entity.EnforcementRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnforcementRuleRepository extends JpaRepository<EnforcementRule, Long> {

    Optional<EnforcementRule> findByViolationCodeIgnoreCase(String violationCode);

    boolean existsByViolationCodeIgnoreCase(String violationCode);

    List<EnforcementRule> findByPublicVisibleTrueAndActiveTrueOrderByViolationCodeAsc();

    List<EnforcementRule> findAllByOrderByViolationCodeAsc();
}