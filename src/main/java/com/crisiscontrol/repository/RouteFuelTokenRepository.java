package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.RouteFuelToken;
import com.crisiscontrol.entity.RouteFuelTokenStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RouteFuelTokenRepository extends JpaRepository<RouteFuelToken, Long> {

    Optional<RouteFuelToken> findByTokenCode(String tokenCode);

    List<RouteFuelToken> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<RouteFuelToken> findByPumpProfileIdOrderByCreatedAtDesc(Long pumpProfileId);

    List<RouteFuelToken> findByPumpProfileIdAndStatusOrderByCreatedAtDesc(
            Long pumpProfileId,
            RouteFuelTokenStatus status
    );

    List<RouteFuelToken> findByPumpProfileIdAndFuelTypeAndStatusOrderByCreatedAtDesc(
            Long pumpProfileId,
            FuelType fuelType,
            RouteFuelTokenStatus status
    );
}