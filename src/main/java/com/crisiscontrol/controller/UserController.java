package com.crisiscontrol.controller;

import com.crisiscontrol.entity.FuelRequest;
import com.crisiscontrol.entity.User;
import com.crisiscontrol.entity.Vehicle;
import com.crisiscontrol.repository.FuelRequestRepository;
import com.crisiscontrol.repository.UserRepository;
import com.crisiscontrol.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final FuelRequestRepository fuelRequestRepository;

    @DeleteMapping("/{userId}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FuelRequest> fuelRequests = fuelRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        fuelRequestRepository.deleteAll(fuelRequests);

        List<Vehicle> vehicles = vehicleRepository.findByUserIdOrderByCreatedAtDesc(userId);
        vehicleRepository.deleteAll(vehicles);

        userRepository.delete(user);

        Map<String, String> response = new HashMap<>();
        response.put("message", "User profile, fuel requests, and vehicles deleted successfully from database.");

        return ResponseEntity.ok(response);
    }
}