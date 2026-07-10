package com.crisiscontrol.repository;

import com.crisiscontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HospitalRepository extends JpaRepository<User, Long> {
    // Return all hospitals under a specific thana
    List<User> findByHospitalUnderThanaOrderByHospitalNameAsc(String thana);
}