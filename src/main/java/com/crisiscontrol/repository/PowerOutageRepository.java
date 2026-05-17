package com.crisiscontrol.repository;

import com.crisiscontrol.entity.PowerOutageNotice;
import com.crisiscontrol.entity.PowerOutageStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface PowerOutageRepository extends JpaRepository<PowerOutageNotice, Long> {

    List<PowerOutageNotice> findAllByOrderByCreatedAtDesc();

    List<PowerOutageNotice> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PowerOutageNotice> findByStatusInOrderByCreatedAtDesc(List<PowerOutageStatus> statuses);
    List<PowerOutageNotice> findByStatusAndExpectedRestorationDateTimeLessThanEqual(
            PowerOutageStatus status,
            LocalDateTime expectedRestorationDateTime
    );

    List<PowerOutageNotice> findByThanaNameIgnoreCaseOrderByCreatedAtDesc(String thanaName);

    boolean existsByThanaNameIgnoreCaseAndStatus(String thanaName, PowerOutageStatus status);

    boolean existsByThanaNameIgnoreCaseAndCreatedAtAfter(
            String thanaName,
            LocalDateTime createdAt
    );

    boolean existsByThanaNameIgnoreCaseAndRestoredAtAfter(
            String thanaName,
            LocalDateTime restoredAt
    );
}
