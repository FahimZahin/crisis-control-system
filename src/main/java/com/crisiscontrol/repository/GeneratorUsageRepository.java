package com.crisiscontrol.repository;

import com.crisiscontrol.entity.GeneratorUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GeneratorUsageRepository extends JpaRepository<GeneratorUsage, Long> {

    List<GeneratorUsage> findByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByPowerOutageNoticeIdAndUserId(Long powerOutageNoticeId, Long userId);
}