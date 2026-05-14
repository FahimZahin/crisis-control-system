package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestSource;
import com.crisiscontrol.entity.FuelRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FuelRequestRepository extends JpaRepository<FuelRequest, Long> {

    List<FuelRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<FuelRequest> findByUserIdAndRequestSourceOrderByCreatedAtDesc(
            Long userId,
            FuelRequestSource requestSource
    );

    List<FuelRequest> findAllByOrderByCreatedAtDesc();

    List<FuelRequest> findByRequestStatusOrderByCreatedAtDesc(FuelRequestStatus requestStatus);

    List<FuelRequest> findByPumpProfileIdAndRequestStatusOrderByCreatedAtDesc(
            Long pumpId,
            FuelRequestStatus requestStatus
    );

    Optional<FuelRequest> findByCollectionCode(String collectionCode);
}