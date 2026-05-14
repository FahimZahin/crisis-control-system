package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.FuelRequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FuelRequestRepository extends JpaRepository<FuelRequest, Long> {

    List<FuelRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<FuelRequest> findAllByOrderByCreatedAtDesc();

    List<FuelRequest> findByRequestStatusOrderByCreatedAtDesc(FuelRequestStatus requestStatus);
}