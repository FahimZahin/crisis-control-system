package com.crisiscontrol.repository;

import com.crisiscontrol.entity.ActivationRequest;
import com.crisiscontrol.entity.ActivationRequestStatus;
import com.crisiscontrol.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivationRequestRepository extends JpaRepository<ActivationRequest, Long> {

    boolean existsByUserAndStatus(User user, ActivationRequestStatus status);

    List<ActivationRequest> findAllByOrderByRequestedAtDesc();

    List<ActivationRequest> findByStatusOrderByRequestedAtDesc(ActivationRequestStatus status);
}