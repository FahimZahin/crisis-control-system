package com.crisiscontrol.service;

import com.crisiscontrol.dto.AuthResponse;
import com.crisiscontrol.dto.LoginRequest;
import com.crisiscontrol.dto.RegisterRequest;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.UserStatus;
import com.crisiscontrol.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthResponse register(RegisterRequest request) {

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("Password and confirm password do not match");
        }

        if (userRepository.existsByPhoneNumber(request.getPhoneNumber())) {
            throw new RuntimeException("Phone number already registered");
        }

        if (userRepository.existsByDrivingLicenseNumber(request.getDrivingLicenseNumber())) {
            throw new RuntimeException("Driving license number already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .drivingLicenseNumber(request.getDrivingLicenseNumber())
                .address(request.getAddress())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        return AuthResponse.builder()
                .message("Registration successful")
                .userId(savedUser.getId())
                .fullName(savedUser.getFullName())
                .role(savedUser.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {

        User user = userRepository.findByPhoneNumber(request.getPhoneNumber())
                .orElseThrow(() -> new RuntimeException("Invalid phone number or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid phone number or password");
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new RuntimeException("User account is not active");
        }

        return AuthResponse.builder()
                .message("Login successful")
                .userId(user.getId())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();
    }
}