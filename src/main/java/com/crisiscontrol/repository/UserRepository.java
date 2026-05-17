package com.crisiscontrol.repository;

import com.crisiscontrol.entity.Role;
import com.crisiscontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByDrivingLicenseNumber(String drivingLicenseNumber);

    boolean existsByHoldingNumber(String holdingNumber);

    boolean existsByBusinessLicenseNumber(String businessLicenseNumber);

    boolean existsByHospitalRegistrationNumber(String hospitalRegistrationNumber);

    boolean existsByUtilityEmployeeId(String utilityEmployeeId);

    boolean existsByOfficialVerificationId(String officialVerificationId);

    boolean existsByGovernmentEmployeeId(String governmentEmployeeId);

    boolean existsByLocalAuthorityId(String localAuthorityId);

    List<User> findByRole(Role role);
}