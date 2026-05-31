package com.crisiscontrol.repository;

import com.crisiscontrol.entity.FuelType;
import com.crisiscontrol.entity.RouteFuelToken;
import com.crisiscontrol.entity.RouteFuelTokenStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

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
    Optional<RouteFuelToken> findFirstByVehicleIdAndStatusOrderByUsedAtDesc(
            Long vehicleId,
            RouteFuelTokenStatus status
    );

    List<RouteFuelToken> findAllByOrderByCreatedAtDesc();

    List<RouteFuelToken> findByStatusOrderByCreatedAtDesc(RouteFuelTokenStatus status);

    long countByStatus(RouteFuelTokenStatus status);

    List<RouteFuelToken> findByPumpProfileIdAndStatusAndUsedAtBetweenOrderByUsedAtDesc(
            Long pumpProfileId,
            RouteFuelTokenStatus status,
            java.time.LocalDateTime start,
            java.time.LocalDateTime end
    );

    List<RouteFuelToken> findByPumpProfileIdAndFuelTypeAndStatusOrderByCreatedAtDesc(
            Long pumpProfileId,
            FuelType fuelType,
            RouteFuelTokenStatus status
    );
}