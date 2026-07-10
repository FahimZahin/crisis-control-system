package com.crisiscontrol.repository;

import com.crisiscontrol.entity.EmergencyVehicleApprovalStatus;
import com.crisiscontrol.entity.EmergencyVehicleProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmergencyVehicleRepository extends JpaRepository<EmergencyVehicleProfile, Long> {

    Optional<EmergencyVehicleProfile> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    boolean existsByVehicleNumber(String vehicleNumber);

    boolean existsByVehicleNumberAndIdNot(String vehicleNumber, Long id);

    boolean existsByVerificationId(String verificationId);

    boolean existsByVerificationIdAndIdNot(String verificationId, Long id);

    List<EmergencyVehicleProfile> findAllByOrderBySubmittedAtDesc();

    List<EmergencyVehicleProfile> findByApprovalStatusOrderBySubmittedAtDesc(
            EmergencyVehicleApprovalStatus approvalStatus
    );
}