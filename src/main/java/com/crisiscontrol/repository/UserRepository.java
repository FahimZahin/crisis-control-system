package com.crisiscontrol.repository;

import com.crisiscontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByDrivingLicenseNumber(String drivingLicenseNumber);

    Optional<User> findByPhoneNumber(String phoneNumber);
}