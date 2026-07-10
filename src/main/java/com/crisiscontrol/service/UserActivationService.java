package com.crisiscontrol.service;

import com.crisiscontrol.entity.ActivationRequest;
import com.crisiscontrol.entity.ActivationRequestStatus;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.ActivationRequestRepository;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserActivationService {

    private final UserRepository userRepository;
    private final ActivationRequestRepository activationRequestRepository;

    public void requestActivation(Long userId, String reason) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new RuntimeException("Your account is already active");
        }

        if (reason == null || reason.trim().isEmpty()) {
            throw new RuntimeException("Activation request reason is required");
        }

        if (activationRequestRepository.existsByUserAndStatus(user, ActivationRequestStatus.PENDING)) {
            throw new RuntimeException("You already have a pending activation request");
        }

        ActivationRequest activationRequest = ActivationRequest.builder()
                .user(user)
                .reason(reason.trim())
                .status(ActivationRequestStatus.PENDING)
                .build();

        activationRequestRepository.save(activationRequest);
    }
}